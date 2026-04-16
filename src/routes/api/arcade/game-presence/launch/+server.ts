import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { PresenceRecord } from '$lib/types';
import type { RequestHandler } from './$types';

const LAUNCH_TTL = 300; // 5 minutes — the window for Roblox Presence API reconciliation

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');
  if (!platform?.env?.KV) error(503, 'KV not available');

  const body = await request.json();
  const { gameId } = body;
  if (!gameId) error(400, 'gameId is required');

  const db = createDbClient(platform.env.DB);
  const profile = await db.profiles.findByUserId(locals.user.id);

  if (!profile?.roblox_user_id) {
    error(400, 'Roblox account not linked');
  }

  const record: PresenceRecord = {
    gameId,
    robloxUserId: profile.roblox_user_id
  };

  await platform.env.KV.put(`presence:user:${locals.user.id}`, JSON.stringify(record), {
    expirationTtl: LAUNCH_TTL
  });

  return json({ success: true });
};
