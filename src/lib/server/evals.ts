/**
 * Moderation evaluator factory.
 *
 * Thin adapter between SvelteKit's `$env/dynamic/private` and the
 * stack-agnostic `@alpha/evals` package. Call `getEvaluator()` inside any
 * server route that needs to moderate content.
 */

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createEvaluator } from '@alpha/evals';
import type { Evaluator } from '@alpha/evals/types';

export function getEvaluator(): Evaluator {
  const geminiKey = env.GEMINI_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  if (!geminiKey || !openaiKey) {
    error(503, 'Moderation not configured');
  }
  return createEvaluator({ geminiKey, openaiKey });
}
