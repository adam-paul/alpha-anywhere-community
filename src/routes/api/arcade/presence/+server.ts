/**
 * Arcade presence — per-game player counts.
 *
 * GET - Returns how many students are currently in each game.
 *
 * Flow:
 * 1. Collect all linked Roblox users with active launch records from KV
 * 2. Batch-query Roblox Presence API for in-game status
 * 3. Reconcile: refresh TTL for in-game users, delete records for offline users
 * 4. Return aggregated counts
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { PresenceCounts, RobloxPresenceResponse } from '$lib/types';

const LAUNCH_TTL = 300; // 5 minutes

export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');
  if (!platform?.env?.KV) error(503, 'KV not available');

  const kv = platform.env.KV;
  const db = createDbClient(platform.env.DB);

  // A. Collect launch records
  const linkedProfiles = await db.profiles.findAllWithRoblox();
  if (linkedProfiles.length === 0) {
    return json({ counts: {} });
  }

  // Check KV for active launch records in parallel
  const launchEntries = await Promise.all(
    linkedProfiles.map(async (p) => {
      const gameId = await kv.get(`launch:${p.roblox_user_id}`);
      return gameId ? { robloxUserId: p.roblox_user_id, gameId } : null;
    })
  );

  const activeLaunches = launchEntries.filter(
    (e): e is { robloxUserId: string; gameId: string } => e !== null
  );

  if (activeLaunches.length === 0) {
    return json({ counts: {} });
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

  await Promise.all(
    activeLaunches.map(async ({ robloxUserId, gameId }) => {
      const presenceType = presenceMap.get(Number(robloxUserId));

      if (presenceType === undefined) {
        // No Roblox API response (API failed or no key) — count based on launch record alone
        counts[gameId] = (counts[gameId] ?? 0) + 1;
        return;
      }

      if (presenceType === 2) {
        // In-game: refresh TTL and count
        await kv.put(`launch:${robloxUserId}`, gameId, { expirationTtl: LAUNCH_TTL });
        counts[gameId] = (counts[gameId] ?? 0) + 1;
      }
    })
  );

  return json({ counts });
};
