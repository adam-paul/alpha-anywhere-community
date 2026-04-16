import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type {
  PresenceApiResponse,
  PresenceCounts,
  PresenceRecord,
  RobloxPresenceResponse
} from '$lib/types';

const LAUNCH_TTL = 300; // 5 minutes

export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.KV) error(503, 'KV not available');

  const kv = platform.env.KV;
  const userId = locals.user.id;

  // A. Per-user direct read — O(1), no DB needed.
  // kv.get() has better same-colo consistency than kv.list(), so the
  // user's own click is reflected here before the global list catches up.
  let currentUserRecord: PresenceRecord | null = null;
  const raw = await kv.get(`presence:user:${userId}`);
  if (raw) {
    try {
      currentUserRecord = JSON.parse(raw) as PresenceRecord;
    } catch {
      // Corrupt or old-format value — treat as absent
    }
  }

  // B. Global list for aggregate counts
  const listed = await kv.list({ prefix: 'presence:user:' });
  if (listed.keys.length === 0 && !currentUserRecord) {
    return json({ counts: {}, currentUserGameId: null } satisfies PresenceApiResponse);
  }

  // Parse each record's JSON value
  const activeLaunches = (
    await Promise.all(
      listed.keys.map(async (key) => {
        const value = await kv.get(key.name);
        if (!value) return null;
        try {
          const record = JSON.parse(value) as PresenceRecord;
          return { keyName: key.name, ...record };
        } catch {
          return null;
        }
      })
    )
  ).filter((e): e is { keyName: string; robloxUserId: string; gameId: string } => e !== null);

  // Collect Roblox IDs for the batch call.
  // Include the current user's ID even if the list hasn't caught up yet.
  const robloxIdSet = new Set(activeLaunches.map((l) => Number(l.robloxUserId)));
  if (currentUserRecord) {
    robloxIdSet.add(Number(currentUserRecord.robloxUserId));
  }
  const robloxUserIds = [...robloxIdSet];

  // C. Query Roblox Presence API
  const presenceMap = new Map<number, number>(); // robloxUserId → presenceType

  if (env.ROBLOX_API_KEY && robloxUserIds.length > 0) {
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
        // Roblox API failure — fall back to launch-record-only counting
      }
    }
  }

  // D. Reconcile — aggregate counts from the list
  const counts: PresenceCounts = {};

  await Promise.all(
    activeLaunches.map(async ({ keyName, robloxUserId, gameId }) => {
      const presenceType = presenceMap.get(Number(robloxUserId));

      if (presenceType === undefined) {
        // No Roblox API response — count from launch record alone (up to 5-min TTL).
        counts[gameId] = (counts[gameId] ?? 0) + 1;
        return;
      }

      if (presenceType === 2) {
        // Confirmed in-game — refresh TTL and count
        const record: PresenceRecord = { gameId, robloxUserId };
        await kv.put(keyName, JSON.stringify(record), { expirationTtl: LAUNCH_TTL });
        counts[gameId] = (counts[gameId] ?? 0) + 1;
      }
      // Any other presenceType (offline, online-not-in-game, studio): don't count,
      // don't refresh. Record expires at its existing TTL.
    })
  );

  // E. Current user's in-game status — derived from the per-user direct read,
  // NOT from the list scan. Strict: only set when Roblox confirms presenceType 2.
  let currentUserGameId: string | null = null;
  if (currentUserRecord) {
    const presenceType = presenceMap.get(Number(currentUserRecord.robloxUserId));
    if (presenceType === 2) {
      currentUserGameId = currentUserRecord.gameId;
    }
  }

  return json({ counts, currentUserGameId } satisfies PresenceApiResponse);
};
