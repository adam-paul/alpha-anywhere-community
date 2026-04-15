/**
 * @alpha/evals — general AI content eval framework.
 *
 * Moderation is the first surface. Future surfaces (imagen, tutor responses,
 * quiz generation, etc.) extend via the Provider / Scorer / Corpus interfaces.
 *
 * Public API:
 *   - `createEvaluator`: build a moderation evaluator given API keys
 *   - All domain types re-exported (also available via `@alpha/evals/types`
 *     for pure-type imports that skip bundling the runtime)
 *
 * Runtime logic lives in neighbor files; this module is a pure barrel.
 */

export { createEvaluator } from './evaluator';

// Pure scoring exports — used by Plan B's eval harness.
export { computeMetrics, computeCompositeScore, checkConstraints } from './core/scoring';
export {
  CATEGORY_WEIGHTS,
  HARD_CONSTRAINTS,
  GEMINI_TEMPERATURE,
  OPENAI_CATEGORY_THRESHOLDS
} from './core/config';
export type { HardConstraintName } from './core/config';

// Domain types.
export type * from './types';
