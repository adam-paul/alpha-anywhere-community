/**
 * Arcade presence — per-game player counts.
 *
 * GET - Returns how many students are currently in each game.
 *
 * Flow:
 * 1. List active launch records from KV (keys with "launch:" prefix)
 * 2. Batch-query Roblox Presence API for in-game status
 * 3. Reconcile: refresh TTL for in-game users, let offline records expire
 * 4. Return aggregated counts
 */

import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';
import type { PresenceApiResponse, PresenceCounts, RobloxPresenceResponse } from '$lib/types';

const LAUNCH_TTL = 300; // 5 minutes

export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.KV) error(503, 'KV not available');

  const kv = platform.env.KV;

  // Look up current user's Roblox ID for per-user presence
  let currentUserRobloxId: string | null = null;
  if (platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    const profile = await db.profiles.findByUserId(locals.user.id);
    currentUserRobloxId = profile?.roblox_user_id ?? null;
  }

  // A. List active launch records directly from KV
  const listed = await kv.list({ prefix: 'launch:' });
  if (listed.keys.length === 0) {
    return json({ counts: {}, currentUserGameId: null } satisfies PresenceApiResponse);
  }

  // Get gameId values for each active key
  const activeLaunches = await Promise.all(
    listed.keys.map(async (key) => {
      const gameId = await kv.get(key.name);
      const robloxUserId = key.name.replace('launch:', '');
      return gameId ? { robloxUserId, gameId } : null;
    })
  ).then((entries) =>
    entries.filter((e): e is { robloxUserId: string; gameId: string } => e !== null)
  );

  if (activeLaunches.length === 0) {
    return json({ counts: {}, currentUserGameId: null } satisfies PresenceApiResponse);
  }

  // B. Query Roblox Presence API
  const robloxUserIds = activeLaunches.map((l) => Number(l.robloxUserId));
  const presenceMap = new Map<number, number>(); // userId → presenceType

  if (env.ROBLOX_API_KEY) {
    // Batch in groups of 100 (Roblox limit)
    for (let i = 0; i < robloxUserIds.length; i += 100) {
      const batch = robloxUserIds.slice(i, i + 100);
      try {
        const res = await fetch('https://presence.roblox.com/v1/presence/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ROBLOX_API_KEY
          },
          body: JSON.stringify({ userIds: batch })
        });

        if (res.ok) {
          const data: RobloxPresenceResponse = await res.json();
          for (const p of data.userPresences) {
            presenceMap.set(p.userId, p.userPresenceType);
          }
        }
      } catch {
        // If Roblox API fails, fall back to launch-record-only counting
      }
    }
  }

  // C. Reconcile
  const counts: PresenceCounts = {};
  let currentUserGameId: string | null = null;

  await Promise.all(
    activeLaunches.map(async ({ robloxUserId, gameId }) => {
      const presenceType = presenceMap.get(Number(robloxUserId));

      if (presenceType === undefined) {
        // No Roblox API response (API failed, no key, or this user's presence is private).
        // Count the user based on the launch record alone — aggregate counts can tolerate
        // a stale click-record estimate for up to 5 min (KV TTL). Do NOT set
        // currentUserGameId here: that signal drives voice auto-join, which cannot
        // tolerate false positives (would pull the user into audio before they're
        // actually in-game, or on stale clicks after they've quit).
        counts[gameId] = (counts[gameId] ?? 0) + 1;
        return;
      }

      if (presenceType === 2) {
        // In-game: refresh TTL and count
        await kv.put(`launch:${robloxUserId}`, gameId, { expirationTtl: LAUNCH_TTL });
        counts[gameId] = (counts[gameId] ?? 0) + 1;
        if (robloxUserId === currentUserRobloxId) currentUserGameId = gameId;
      }
    })
  );

  return json({ counts, currentUserGameId } satisfies PresenceApiResponse);
};
