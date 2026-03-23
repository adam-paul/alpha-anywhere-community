import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import type { RequestHandler } from './$types';

/** POST — Create a new conversation. */
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const body = await request.json();
  const { participantIds } = body as { participantIds: string[] };

  if (!participantIds?.length) {
    error(400, 'participantIds is required');
  }
  if (participantIds.includes(locals.user.id)) {
    error(400, 'Cannot include self in participantIds');
  }

  const db = createDbClient(platform.env.DB);

  // For 1:1, check if conversation already exists
  if (participantIds.length === 1) {
    const existing = await db.conversations.findDirectConversation(
      locals.user.id,
      participantIds[0]
    );
    if (existing) {
      // Load details for the existing conversation
      const allConvs = await db.conversations.getWithDetails(locals.user.id);
      const conv = allConvs.find((c) => c.id === existing.id);
      return json({ conversation: conv });
    }
  }

  // Create with current user included
  const allParticipantIds = [locals.user.id, ...participantIds];
  const conversation = await db.conversations.create(allParticipantIds);

  // Load the full details for the response
  const allConvs = await db.conversations.getWithDetails(locals.user.id);
  const conv = allConvs.find((c) => c.id === conversation.id);

  return json({ conversation: conv });
};
