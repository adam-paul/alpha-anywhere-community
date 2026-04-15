/**
 * Moderation evaluator factory + server-side persistence helper.
 *
 * Thin adapter between SvelteKit's `$env/dynamic/private` and the
 * stack-agnostic `@alpha/evals` package. `getEvaluator()` builds the
 * evaluator; `moderateAndPersist()` wraps a single moderation call with
 * its audit-trail writes (generation_events always, moderation_events on
 * flag) so route handlers don't duplicate the persistence pattern.
 */

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createEvaluator } from '@alpha/evals';
import type { Evaluator, ModerationDecision, ModerationSource } from '@alpha/evals/types';
import type { DbClient } from './db/client';
import type { PersistedDetectedBy } from './db/types';

export function getEvaluator(): Evaluator {
  const geminiKey = env.GEMINI_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  if (!geminiKey || !openaiKey) {
    error(503, 'Moderation not configured');
  }
  return createEvaluator({ geminiKey, openaiKey });
}

/**
 * HMAC-SHA256(user_id, SESSION_SECRET), hex. Used to log user attribution on
 * generation_events without storing raw user IDs (COPPA).
 */
export async function hashUserId(userId: string): Promise<string> {
  const secret = env.SESSION_SECRET;
  if (!secret) error(503, 'SESSION_SECRET not configured');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Run moderation for a single piece of user-generated content and persist
 * the audit trail.
 *
 *   moderation_events — written synchronously when flagged (on the critical
 *     path; the response depends on knowing the row was committed).
 *   generation_events — written post-response via `ctx.waitUntil(...)` so
 *     the observability log doesn't add D1-insert latency to the user's
 *     request. Under vite-only dev (`ctx` undefined) we fall back to
 *     awaiting inline — preserves parity for local testing.
 *
 * Background write failures log to console (surfaces in wrangler tail) so
 * observability bugs don't silently disappear.
 */
export async function moderateAndPersist(
  db: DbClient,
  userId: string,
  text: string,
  source: ModerationSource,
  ctx: App.Platform['context'] | undefined
): Promise<ModerationDecision> {
  const evaluator = getEvaluator();
  const decision = await evaluator.moderate(text, source);

  // Moderation flag — critical path, await before responding.
  if (decision.status === 'flagged') {
    const primary = decision.categories[0];
    await db.moderation.createEvent({
      user_id: userId,
      source,
      category: primary.category,
      subcategory: primary.subcategory,
      severity: decision.severity ?? 'medium',
      // Inside status==='flagged' → categories.length > 0 → detectedBy !== 'none'.
      // Type system can't prove it; the assertion narrows to the DB CHECK-compatible set.
      detected_by: decision.detectedBy as PersistedDetectedBy,
      confidence: primary.confidence,
      flagged_content: text,
      detection_details: JSON.stringify({ gemini: decision.gemini, openai: decision.openai }),
      latency_ms: decision.latencyMs
    });
  }

  // Audit log — defer past the response when the Workers runtime allows it.
  const logPromise = hashUserId(userId).then((userIdHash) =>
    db.evals.createGenerationEvent({
      user_id_hash: userIdHash,
      event_type: source,
      input_text: text,
      output_data: JSON.stringify({
        gemini: decision.gemini,
        openai: decision.openai,
        merged: {
          flagged: decision.flagged,
          categories: decision.categories,
          detectedBy: decision.detectedBy
        }
      }),
      success: decision.status !== 'unavailable',
      error_message:
        decision.status === 'unavailable'
          ? `${decision.gemini.error ?? ''} | ${decision.openai.error ?? ''}`.trim()
          : null,
      latency_ms: decision.latencyMs
    })
  );

  if (ctx) {
    ctx.waitUntil(logPromise.catch((e) => console.error('generation_events write failed:', e)));
  } else {
    // Vite-only dev — no ExecutionContext. Await inline so we don't drop the log.
    await logPromise.catch((e) => console.error('generation_events write failed:', e));
  }

  return decision;
}
