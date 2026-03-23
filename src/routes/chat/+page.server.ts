import { redirect, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { PageServerLoad } from './$types';
import type { Conversation, ChatParticipant } from '$lib/types';

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) redirect(302, '/');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const db = createDbClient(platform.env.DB);

  // Load conversations with participants, last messages, and unread counts
  const rawConversations = await db.conversations.getWithDetails(locals.user.id);

  const conversations: Conversation[] = rawConversations.map((c) => ({
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

  // Load friends list for NewChatModal
  const friendUsers = await db.friendships.getFriends(locals.user.id);

  // Batch-load profiles for friends
  const friends: ChatParticipant[] = await Promise.all(
    friendUsers.map(async (user) => {
      const profile = await db.profiles.findByUserId(user.id);
      return {
        id: user.id,
        displayName: user.display_name,
        avatarUrl: profile?.avatar_url ?? null,
        handle: user.email.split('@')[0]
      };
    })
  );

  return { conversations, friends };
};
