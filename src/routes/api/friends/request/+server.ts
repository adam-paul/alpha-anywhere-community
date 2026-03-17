/**
 * Friend request API endpoint
 *
 * POST - Send a friend request to another user
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

  const { addresseeId } = await request.json();
  if (!addresseeId || typeof addresseeId !== 'string') {
    error(400, 'addresseeId is required');
  }

  if (addresseeId === locals.user.id) {
    error(400, 'Cannot send a friend request to yourself');
  }

  const db = createDbClient(platform.env.DB);

  // Check for existing relationship (either direction)
  const existing = await db.friendships.getStatus(locals.user.id, addresseeId);
  if (existing) {
    if (existing.status === 'pending' && existing.addressee_id === locals.user.id) {
      // They already sent us a request — auto-accept instead of creating a duplicate
      const accepted = await db.friendships.accept(existing.id);
      return json({ success: true, friendship: accepted });
    }
    error(409, 'Friend request already exists');
  }

  try {
    const friendship = await db.friendships.sendRequest(locals.user.id, addresseeId);
    return json({ success: true, friendship });
  } catch (err) {
    // UNIQUE constraint violation means request already exists (race condition fallback)
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      error(409, 'Friend request already exists');
    }
    throw err;
  }
};
