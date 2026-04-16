import { json, error } from '@sveltejs/kit';
import { createDbClient } from '$lib/server/db/client';
import { moderateAndPersist } from '$lib/server/evals';
import type { RequestHandler } from './$types';

/**
 * POST /api/lobby/[gameId]/message — moderate an ephemeral lobby chat message.
 *
 * Mirrors the chat message endpoint's moderation gate but skips the D1 insert
 * entirely. On success the client broadcasts the message over the lobby's
 * realtime channel; nothing is persisted to the messages table. Audit writes
 * (generation_events always, moderation_events on flag) still happen via
 * moderateAndPersist so the moderation pipeline is uniform.
 */
export const POST: RequestHandler = async ({ locals, platform, request, params }) => {
  if (!locals.user) error(401, 'Not authenticated');
  if (!platform?.env?.DB) error(503, 'Database not available');

  const { gameId } = params;
  if (!gameId) error(400, 'gameId is required');

  const body = await request.json();
  const { content } = body as { content: string };
  if (!content?.trim()) error(400, 'content is required');

  const db = createDbClient(platform.env.DB);

  const game = await db.games.findById(gameId);
  if (!game) error(404, 'Game not found');

  const trimmed = content.trim();

  // Reuse 'chat_message' source — lobby chat uses identical moderation policy.
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

  return json({ ok: true });
};
