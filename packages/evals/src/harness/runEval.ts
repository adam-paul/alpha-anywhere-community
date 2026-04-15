/**
 * Eval harness runner.
 *
 * Pure: takes an `Evaluator` + corpus cases, returns a typed report.
 * Side-effect-free — never writes to D1, never logs to generation_events.
 * Persistence is the caller's responsibility (the CLI does it via wrangler).
 *
 * Ports AlphaLearn `eval_moderation.py` flow: for each case, call both
 * providers via the shared evaluator, record per-provider + merged outcomes,
 * compute metrics at three levels (gemini-only / openai-only / merged),
 * aggregate constraints + composite from the merged view.
 */

import { checkConstraints, computeCompositeScore, computeMetrics } from '../core/scoring';
import type { EvalCaseResult, Evaluator, MetricsByCategory, ModerationCategory } from '../types';
import type { CorpusCase } from './corpus';

export interface SingleCaseResult {
  case_id: string;
  category: ModerationCategory;
  subcategory: string;
  expected_flagged: boolean;
  gemini_flagged: boolean;
  openai_flagged: boolean;
  /** Merged outcome — what the production pipeline would have decided. */
  merged_flagged: boolean;
  detected_by: string;
  latency_ms: number;
  gemini_error: string | null;
  openai_error: string | null;
}

export interface RunReport {
  caseResults: SingleCaseResult[];
  geminiMetrics: MetricsByCategory;
  openaiMetrics: MetricsByCategory;
  mergedMetrics: MetricsByCategory;
  compositeScore: number;
  constraintsPassed: boolean;
  constraintViolations: string[];
  evalTimeS: number;
  avgLatencyMs: number;
  evalErrors: number;
  corpusSize: number;
  corpusHash: string;
}

export interface RunEvalOptions {
  evaluator: Evaluator;
  cases: CorpusCase[];
  corpusHash: string;
  /** Max concurrent provider calls. Default 4. */
  parallel?: number;
  /** Called after each case resolves; useful for progress bars in the CLI. */
  onCaseComplete?: (result: SingleCaseResult, index: number, total: number) => void;
}

export async function runEval(opts: RunEvalOptions): Promise<RunReport> {
  const { evaluator, cases, corpusHash, parallel = 4, onCaseComplete } = opts;

  const tStart = Date.now();
  const caseResults: SingleCaseResult[] = new Array(cases.length);
  let evalErrors = 0;
  let completed = 0;

  // Chunked Promise.all — cheap parallelism without an external queue lib.
  for (let i = 0; i < cases.length; i += parallel) {
    const chunk = cases.slice(i, i + parallel);
    const chunkResults = await Promise.all(
      chunk.map(async (c, j) => {
        const idx = i + j;
        try {
          const decision = await evaluator.moderate(c.input_text, c.source_type);
          // 'unavailable' = both providers errored. Count as an eval error but
          // still record the (non-flagging) outcome so metrics aren't skewed
          // by missing rows. Consistent with AlphaLearn counting errors.
          if (decision.status === 'unavailable') evalErrors++;

          const result: SingleCaseResult = {
            case_id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            expected_flagged: c.expected_flagged,
            gemini_flagged: decision.gemini.flagged && decision.gemini.error === null,
            openai_flagged: decision.openai.flagged && decision.openai.error === null,
            merged_flagged: decision.flagged && decision.status !== 'unavailable',
            detected_by: decision.detectedBy,
            latency_ms: decision.latencyMs,
            gemini_error: decision.gemini.error,
            openai_error: decision.openai.error
          };
          return { idx, result };
        } catch (e) {
          // Should never happen — evaluator.moderate never throws. Guard anyway.
          evalErrors++;
          const msg = e instanceof Error ? e.message : String(e);
          const result: SingleCaseResult = {
            case_id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            expected_flagged: c.expected_flagged,
            gemini_flagged: false,
            openai_flagged: false,
            merged_flagged: false,
            detected_by: 'none',
            latency_ms: 0,
            gemini_error: msg,
            openai_error: msg
          };
          return { idx, result };
        }
      })
    );
    for (const { idx, result } of chunkResults) {
      caseResults[idx] = result;
      completed++;
      onCaseComplete?.(result, completed, cases.length);
    }
  }

  const evalTimeS = (Date.now() - tStart) / 1000;

  // Three-level metrics: gemini-only, openai-only, merged (production).
  const geminiMetrics = computeMetrics(toEvalCaseResults(caseResults, 'gemini_flagged'));
  const openaiMetrics = computeMetrics(toEvalCaseResults(caseResults, 'openai_flagged'));
  const mergedMetrics = computeMetrics(toEvalCaseResults(caseResults, 'merged_flagged'));

  const compositeScore = computeCompositeScore(mergedMetrics);
  const { passed, violations } = checkConstraints(mergedMetrics);

  const avgLatencyMs =
    caseResults.length > 0
      ? caseResults.reduce((sum, r) => sum + r.latency_ms, 0) / caseResults.length
      : 0;

  return {
    caseResults,
    geminiMetrics,
    openaiMetrics,
    mergedMetrics,
    compositeScore,
    constraintsPassed: passed,
    constraintViolations: violations,
    evalTimeS,
    avgLatencyMs,
    evalErrors,
    corpusSize: cases.length,
    corpusHash
  };
}

function toEvalCaseResults(
  results: SingleCaseResult[],
  flaggedField: 'gemini_flagged' | 'openai_flagged' | 'merged_flagged'
): EvalCaseResult[] {
  return results.map((r) => ({
    category: r.category,
    expectedFlagged: r.expected_flagged,
    actualFlagged: r[flaggedField]
  }));
}
