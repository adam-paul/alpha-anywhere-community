/**
 * Root layout server load
 *
 * Loads app-wide state: user session, friends, notifications, conversations,
 * and the active theme. Chat state (including unread counts) lives at layout
 * level so the sidebar badge and the chat page share one source of truth.
 */

import { createDbClient } from '$lib/server/db/client';
import { DEFAULT_THEME, THEMES } from '$lib/constants';
import type { ChatParticipant, Conversation, Notification, Theme } from '$lib/types';
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

export const load: LayoutServerLoad = async ({ locals, platform, cookies }) => {
  let friends: ChatParticipant[] = [];
  let notifications: Notification[] = [];
  let conversations: Conversation[] = [];

  // Resolve theme from cookie. Validate against the manifest — cookies are
  // user-controlled, unknown values fall back to the default.
  const cookieTheme = cookies.get('theme');
  const theme: Theme =
    cookieTheme && Object.hasOwn(THEMES, cookieTheme) ? (cookieTheme as Theme) : DEFAULT_THEME;

  if (locals.user && platform?.env?.DB) {
    const db = createDbClient(platform.env.DB);
    const [friendUsers, notifRows, rawConversations] = await Promise.all([
      db.friendships.getFriends(locals.user.id),
      db.notifications.getForUser(locals.user.id),
      db.conversations.getWithDetails(locals.user.id)
    ]);
    notifications = notifRows.map(toNotification);

    conversations = rawConversations.map((c) => ({
      id: c.id,
      name: c.name ?? undefined,
      participants: c.participants.map((p) => ({
        id: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        handle: p.handle
      })),
      lastMessage: c.lastMessage
        ? {
            content: c.lastMessage.content,
            senderId: c.lastMessage.senderId,
            timestamp: new Date(c.lastMessage.createdAt)
          }
        : undefined,
      unreadCount: c.unreadCount
    }));

    const friendProfiles = await Promise.all(
      friendUsers.map((u) => db.profiles.findByUserId(u.id))
    );
    friends = friendUsers.map((u, i) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: friendProfiles[i]?.avatar_url ?? null,
      handle: u.email.split('@')[0]
    }));
  }

  return {
    user: locals.user,
    friends,
    notifications,
    conversations,
    theme
  };
};
