/**
 * Accept friend request API endpoint
 *
 * POST - Accept a pending friend request
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

  // Verify the friendship exists and the current user is the addressee
  const friendship = await db.friendships.findById(friendshipId);
  if (!friendship || friendship.status !== 'pending') {
    error(404, 'Pending friend request not found');
  }

  if (friendship.addressee_id !== locals.user.id) {
    error(403, 'Only the recipient can accept a friend request');
  }

  const accepted = await db.friendships.accept(friendshipId);
  return json({ success: true, friendship: accepted });
};
