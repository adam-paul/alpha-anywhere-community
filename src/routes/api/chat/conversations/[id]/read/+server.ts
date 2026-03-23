import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

/** POST — Mark a conversation as read for the current user. */
export const POST: RequestHandler = async ({ locals, platform, params }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const db = createDbClient(platform.env.DB);
  await db.conversations.markAsRead(params.id, locals.user.id);

  return json({ success: true });
};
