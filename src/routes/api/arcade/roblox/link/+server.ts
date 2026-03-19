/**
 * Roblox account linking — save a confirmed Roblox identity to the user's profile.
 *
 * POST - Link Roblox account (after user confirms via lookup).
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const body = await request.json();
  const { robloxUserId, robloxUsername, robloxAvatarUrl } = body;

  if (!robloxUserId || !robloxUsername) {
    error(400, 'Missing required fields: robloxUserId, robloxUsername');
  }

  const db = createDbClient(platform.env.DB);

  try {
    await db.profiles.linkRoblox(locals.user.id, {
      roblox_user_id: robloxUserId,
      roblox_username: robloxUsername,
      roblox_avatar_url: robloxAvatarUrl ?? ''
    });

    return json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      error(409, 'This Roblox account is linked to another student');
    }
    throw err;
  }
};
