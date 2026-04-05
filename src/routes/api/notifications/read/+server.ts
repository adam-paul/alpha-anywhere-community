import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

/** POST — Mark one or all notifications as read. */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const { notificationId } = await request.json();
  const db = createDbClient(platform.env.DB);

  if (notificationId && typeof notificationId === 'string') {
    await db.notifications.markAsRead(notificationId, locals.user.id);
  } else {
    await db.notifications.markAllAsRead(locals.user.id);
  }

  return json({ success: true });
};
