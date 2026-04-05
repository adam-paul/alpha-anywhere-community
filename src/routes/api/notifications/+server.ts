import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { Notification } from '$lib/types';
import type { NotificationWithActor } from '$lib/server/db/types';
import type { RequestHandler } from './$types';

function toNotification(row: NotificationWithActor): Notification {
  return {
    id: row.id,
    type: row.type,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
    referenceId: row.reference_id,
    read: row.read_at !== null,
    createdAt: row.created_at
  };
}

/** GET — Fetch recent notifications for the current user. */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50);
  const db = createDbClient(platform.env.DB);

  const [rows, unreadCount] = await Promise.all([
    db.notifications.getForUser(locals.user.id, limit),
    db.notifications.getUnreadCount(locals.user.id)
  ]);

  return json({
    notifications: rows.map(toNotification),
    unreadCount
  });
};
