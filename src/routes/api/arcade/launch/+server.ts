/**
 * Game launch tracking — record that a student launched a game.
 *
 * POST - Write launch record to KV with 5-minute TTL.
 * Called just before the deep link opens. Fire-and-forget from the frontend.
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

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

  await platform.env.KV.put(`launch:${profile.roblox_user_id}`, gameId, {
    expirationTtl: 300 // 5 minutes
  });

  return json({ success: true });
};
