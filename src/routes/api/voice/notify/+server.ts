import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const { conversationId } = (await request.json()) as { conversationId: string };
  if (!conversationId?.trim()) error(400, 'conversationId is required');

  const db = createDbClient(platform.env.DB);

  // Verify user is a participant
  const participants = await db.conversations.getParticipants(conversationId);
  if (!participants.some((p) => p.id === locals.user!.id)) {
    error(403, 'Not a participant');
  }

  // Notify other participants
  await Promise.all(
    participants
      .filter((p) => p.id !== locals.user!.id)
      .map((p) =>
        db.notifications.create({
          recipient_id: p.id,
          actor_id: locals.user!.id,
          type: 'voice_call_started',
          reference_id: conversationId
        })
      )
  );

  return json({ ok: true });
};
