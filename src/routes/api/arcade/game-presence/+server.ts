import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { GamePresenceResponse, PresenceRecord, RobloxPresenceResponse } from '$lib/types';

const LAUNCH_TTL = 300; // match launch endpoint TTL — refresh records we confirm in-game

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.KV) error(503, 'KV not available');

  const gameId = url.searchParams.get('gameId');
  if (!gameId) error(400, 'gameId query param is required');

  const kv = platform.env.KV;

  // Scan all presence records, filter to this game only. We still do a full list scan
  // because the KV key space is per-user, not per-game — but the downstream Roblox
  // API call and all subsequent work is scoped to one game's players.
  const listed = await kv.list({ prefix: 'presence:user:' });
  if (listed.keys.length === 0) {
    return json({ inGameCount: 0, currentUserInGame: false } satisfies GamePresenceResponse);
  }

  const forThisGame = (
    await Promise.all(
      listed.keys.map(async (key) => {
        const value = await kv.get(key.name);
        if (!value) return null;
        try {
          const record = JSON.parse(value) as PresenceRecord;
          if (record.gameId !== gameId) return null;
          return {
            keyName: key.name,
            userIdFromKey: key.name.replace('presence:user:', ''),
            ...record
          };
        } catch {
          return null;
        }
      })
    )
  ).filter(
    (e): e is { keyName: string; userIdFromKey: string; robloxUserId: string; gameId: string } =>
      e !== null
  );

  if (forThisGame.length === 0) {
    return json({ inGameCount: 0, currentUserInGame: false } satisfies GamePresenceResponse);
  }

  // Batch-query Roblox Presence API for only the users registered against this game.
  const robloxUserIds = [...new Set(forThisGame.map((r) => Number(r.robloxUserId)))];
  const presenceMap = new Map<number, number>();

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
        // Roblox API failure — fall back to record-only counting below
      }
    }
  }

  let inGameCount = 0;
  let currentUserInGame = false;
  const currentUserId = locals.user.id;

  await Promise.all(
    forThisGame.map(async (record) => {
      const presenceType = presenceMap.get(Number(record.robloxUserId));

      // presenceType 2 = in-game. Refresh TTL for confirmed users so they stay counted.
      // No Roblox response at all → count from the record alone (degrades gracefully).
      const counts = presenceType === 2 || presenceType === undefined;
      if (!counts) return;

      inGameCount += 1;
      if (record.userIdFromKey === currentUserId) {
        currentUserInGame = true;
      }

      if (presenceType === 2) {
        const refreshed: PresenceRecord = {
          gameId: record.gameId,
          robloxUserId: record.robloxUserId
        };
        await kv.put(record.keyName, JSON.stringify(refreshed), { expirationTtl: LAUNCH_TTL });
      }
    })
  );

  return json({ inGameCount, currentUserInGame } satisfies GamePresenceResponse);
};
