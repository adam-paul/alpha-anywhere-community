/**
 * Remove friendship API endpoint
 *
 * POST - Remove a friendship (decline, cancel sent request, or unfriend)
 */

import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) {
    error(401, 'Not authenticated');
  }

  if (!platform?.env?.DB) {
    error(503, 'Database not available');
  }

  const { friendshipId } = await request.json();
  if (!friendshipId || typeof friendshipId !== 'string') {
    error(400, 'friendshipId is required');
  }

  const db = createDbClient(platform.env.DB);

  // Verify the friendship exists and the current user is one of the parties
  const friendship = await db.friendships.findById(friendshipId);
  if (!friendship) {
    error(404, 'Friendship not found');
  }

  const userId = locals.user.id;
  if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
    error(403, 'Not authorized to remove this friendship');
  }

  await db.friendships.remove(friendshipId);
  return json({ success: true });
};
