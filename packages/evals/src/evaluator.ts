/**
 * Top-level evaluator.
 *
 * Runs both providers in parallel with independent per-provider timeouts
 * (via AbortSignal.timeout). Uses Promise.allSettled so that one provider
 * throwing synchronously (e.g. missing key) doesn't lose the other's fate.
 *
 * Outcomes:
 *   - both clean           → status='clean', flagged=false
 *   - either flagged       → status='flagged', merged categories, severity, userMessage
 *   - both errored/timeout → status='unavailable', flagged=true (block the write), generic userMessage
 */

import { mergeResults } from './core/merge';
import { determineSeverity, userFacingMessage } from './core/severity';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAIProvider } from './providers/openai';
import type { Provider } from './providers/provider';
import type {
  Evaluator,
  EvaluatorConfig,
  ModerationDecision,
  ModerationSource,
  SingleCheckResult
} from './types';

const DEFAULT_TIMEOUT_MS = 5000;

export function createEvaluator(config: EvaluatorConfig): Evaluator {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const gemini = createGeminiProvider({ apiKey: config.geminiKey });
  const openai = createOpenAIProvider({ apiKey: config.openaiKey });

  return {
    async moderate(text: string, source: ModerationSource): Promise<ModerationDecision> {
      const start = Date.now();

      // Run providers in parallel with independent per-provider timeouts.
      // `runWithTimeout` never throws (catches inside) so Promise.all is
      // safe here — one provider's failure cannot abort the other.
      const [geminiResult, openaiResult] = await Promise.all([
        runWithTimeout(gemini, text, source, timeoutMs),
        runWithTimeout(openai, text, source, timeoutMs)
      ]);

      const latencyMs = Date.now() - start;

      const bothErrored = geminiResult.error !== null && openaiResult.error !== null;
      if (bothErrored) {
        return {
          status: 'unavailable',
          flagged: true, // block the write
          categories: [],
          severity: null,
          userMessage: "We couldn't check this content right now. Please try again in a moment.",
          detectedBy: 'none',
          latencyMs,
          gemini: geminiResult,
          openai: openaiResult
        };
      }

      const merged = mergeResults(geminiResult, openaiResult);

      if (!merged.flagged) {
        return {
          status: 'clean',
          flagged: false,
          categories: [],
          severity: null,
          userMessage: null,
          detectedBy: merged.detectedBy,
          latencyMs,
          gemini: geminiResult,
          openai: openaiResult
        };
      }

      return {
        status: 'flagged',
        flagged: true,
        categories: merged.categories,
        severity: determineSeverity(merged.categories),
        userMessage: userFacingMessage(merged.categories, source),
        detectedBy: merged.detectedBy,
        latencyMs,
        gemini: geminiResult,
        openai: openaiResult
      };
    }
  };
}

/**
 * Run a provider with its own AbortSignal.timeout so one slow provider
 * doesn't affect the other. Providers never throw — but we still wrap in
 * try/catch as a belt-and-suspenders measure for unexpected errors.
 */
async function runWithTimeout(
  provider: Provider,
  text: string,
  source: ModerationSource,
  timeoutMs: number
): Promise<SingleCheckResult> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await provider.check(text, { source, signal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      flagged: false,
      categories: [],
      explanation: null,
      error: `${provider.name}: ${msg}`,
      latencyMs: timeoutMs, // worst-case bound; the clock is already gone
      rawResponse: null
    };
  }
}
