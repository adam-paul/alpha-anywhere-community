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
import type { Evaluator, EvaluatorConfig, ModerationDecision, ModerationSource } from './types';

const DEFAULT_TIMEOUT_MS = 5000;

export function createEvaluator(config: EvaluatorConfig): Evaluator {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const gemini = createGeminiProvider({ apiKey: config.geminiKey });
  const openai = createOpenAIProvider({ apiKey: config.openaiKey });

  return {
    async moderate(text: string, source: ModerationSource): Promise<ModerationDecision> {
      const start = Date.now();

      // Run providers in parallel with independent per-provider timeouts.
      // Both providers capture errors internally and return SingleCheckResult
      // with `.error` set, so one provider's failure cannot abort the other.
      const [geminiResult, openaiResult] = await Promise.all([
        gemini.check(text, { source, signal: AbortSignal.timeout(timeoutMs) }),
        openai.check(text, { source, signal: AbortSignal.timeout(timeoutMs) })
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
