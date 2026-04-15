/**
 * Admin debugger for the moderation classifier.
 *
 * Classifies a single text input through the full Gemini + OpenAI + merge
 * pipeline and returns the raw ModerationDecision. No D1 writes. Used for
 * on-the-fly prompt tuning without running a full corpus pass.
 */

import { json, error } from '@sveltejs/kit';
import { assertAdmin } from '$lib/server/admin';
import { getEvaluator } from '$lib/server/evals';
import { MODERATION_SOURCES, type ModerationSource } from '@alpha/evals/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) error(401, 'Not authenticated');
  assertAdmin(locals.user);

  const body = await request.json();
  const { text, source } = body as { text?: unknown; source?: unknown };

  if (typeof text !== 'string' || !text.trim()) {
    error(400, 'text is required');
  }
  if (typeof source !== 'string' || !MODERATION_SOURCES.includes(source as ModerationSource)) {
    error(400, `source must be one of: ${MODERATION_SOURCES.join(', ')}`);
  }

  return json(await getEvaluator().moderate(text, source as ModerationSource));
};
