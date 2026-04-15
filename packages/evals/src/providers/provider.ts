/**
 * Provider interface.
 *
 * Both Gemini and OpenAI implementations conform to this shape. The
 * evaluator calls `check` on each provider in parallel; the harness (Plan
 * B) iterates providers generically.
 *
 * Providers never throw — failures (timeout, HTTP error, parse error)
 * become `SingleCheckResult.error`. This lets the evaluator preserve
 * independent fate-tracking via Promise.allSettled.
 */

import type { ModerationSource, SingleCheckResult } from '../types';

export interface ProviderCheckOptions {
  source: ModerationSource;
  signal: AbortSignal;
}

export interface Provider {
  readonly name: 'gemini' | 'openai';
  check(text: string, opts: ProviderCheckOptions): Promise<SingleCheckResult>;
}
