/**
 * Root layout server load
 *
 * Passes session, friend list, and app-wide counts to all pages via event.locals (populated in hooks.server.ts).
 */

import { createDbClient } from '$lib/server/db/client';
import type { FriendSummary, Notification } from '$lib/types';
import type { NotificationWithActor } from '$lib/server/db/types';
import type { LayoutServerLoad } from './$types';

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

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  let friends: FriendSummary[] = [];
  let notifications: Notification[] = [];
  let notificationUnreadCount = 0;
  let chatUnreadCount = 0;

  if (locals.user && platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    const [friendUsers, notifRows, notifUnread, chatUnread] = await Promise.all([
      db.friendships.getFriends(locals.user.id),
      db.notifications.getForUser(locals.user.id),
      db.notifications.getUnreadCount(locals.user.id),
      db.conversations.getTotalUnreadCount(locals.user.id)
    ]);
    notifications = notifRows.map(toNotification);
    notificationUnreadCount = notifUnread;
    chatUnreadCount = chatUnread;

    const friendProfiles = await Promise.all(
      friendUsers.map((u) => db.profiles.findByUserId(u.id))
    );
    friends = friendUsers.map((u, i) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: friendProfiles[i]?.avatar_url ?? null
    }));
  }

  return {
    user: locals.user,
    friends,
    notifications,
    notificationUnreadCount,
    chatUnreadCount
  };
};
