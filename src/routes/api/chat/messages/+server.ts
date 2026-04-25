import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { moderateAndPersist } from '$lib/server/evals';
import type { RequestHandler } from './$types';

/** GET — Load messages for a conversation (paginated). */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const conversationId = url.searchParams.get('conversationId');
  if (!conversationId) error(400, 'conversationId is required');

  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const before = url.searchParams.get('before') ?? undefined;

  const db = createDbClient(platform.env.DB);

  // Verify user is a participant
  const participants = await db.conversations.getParticipants(conversationId);
  if (!participants.some((p) => p.id === locals.user!.id)) {
    error(403, 'Not a participant');
  }

  const dbMessages = await db.messages.getForConversation(conversationId, limit, before);

  // Reverse to chronological order (DB returns newest first)
  const messages = dbMessages.reverse().map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    imageUrl: m.image_url,
    timestamp: m.created_at
  }));

  return json({ messages });
};

/** POST — Send a message. */
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const body = await request.json();
  const { conversationId, content } = body as { conversationId: string; content: string };

  if (!conversationId || !content?.trim()) {
    error(400, 'conversationId and content are required');
  }

  const db = createDbClient(platform.env.DB);

  // Verify user is a participant
  const participants = await db.conversations.getParticipants(conversationId);
  if (!participants.some((p) => p.id === locals.user!.id)) {
    error(403, 'Not a participant');
  }

  const trimmed = content.trim();

  // Moderation gate — block before any D1 write. moderateAndPersist handles
  // both generation_events (always) and moderation_events (on flag).
  const decision = await moderateAndPersist(
    db,
    locals.user.id,
    trimmed,
    'chat_message',
    platform.context
  );

  if (decision.status === 'flagged') {
    return json(
      {
        error: 'moderation_rejected',
        category: decision.categories[0].category,
        message: decision.userMessage
      },
      { status: 400 }
    );
  }

  if (decision.status === 'unavailable') {
    return json(
      { error: 'moderation_unavailable', message: decision.userMessage },
      { status: 503 }
    );
  }

  const message = await db.messages.create({
    conversation_id: conversationId,
    sender_id: locals.user.id,
    content: trimmed
  });

  return json({
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    content: message.content,
    timestamp: message.created_at
  });
};
