/**
 * Roblox account unlinking — remove Roblox identity from user's profile.
 *
 * POST - Unlink Roblox account.
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const db = createDbClient(platform.env.DB);
  await db.profiles.unlinkRoblox(locals.user.id);

  return json({ success: true });
};
