/**
 * Optimization surface — tunable knobs for the Karpathy autoresearch loop.
 *
 * Ported verbatim from AlphaLearn `optimization_surface.py` + `scoring.py`
 * constants. These values are the target of Plan C's autoresearch loop;
 * agent-authored experiments edit this file, the loop runs the harness,
 * and git commits/reverts based on composite score + hard constraints.
 *
 * Do NOT put escalation thresholds, severity logic, or safety settings here —
 * those are safety policy, not classification tuning.
 */

import type { ModerationCategory } from '../types';

/**
 * Gemini classification temperature. Lower = more deterministic.
 * At 0.1, outputs are highly consistent across retries.
 */
export const GEMINI_TEMPERATURE = 0.1;

/**
 * Per-category minimum score to treat an OpenAI-flagged category as a flag.
 *
 * OpenAI's internal per-category thresholds are undocumented and not uniform;
 * our values layer on top, letting us be more conservative per category than
 * OpenAI's own flagged booleans. Lower = more sensitive.
 *
 * Calibrated for a children's platform:
 *   - violence / violence/graphic: gaming and sports language trips these
 *     constantly, so require high confidence before treating them as flags.
 *   - sexual/minors + self-harm/*: child-safety critical, prefer sensitivity.
 *   - everything else: OpenAI's default calibration is roughly right.
 */
export const OPENAI_CATEGORY_THRESHOLDS: Record<string, number> = {
  violence: 0.955,
  'violence/graphic': 0.955,
  harassment: 0.7,
  'harassment/threatening': 0.5,
  hate: 0.5,
  'hate/threatening': 0.5,
  sexual: 0.5,
  'sexual/minors': 0.3,
  illicit: 0.5,
  'illicit/violent': 0.5,
  'self-harm': 0.3,
  'self-harm/intent': 0.3,
  'self-harm/instructions': 0.3
};

/**
 * Severity weights for composite F1.
 * Higher weight = more influence on the overall optimization score.
 */
export const CATEGORY_WEIGHTS: Record<ModerationCategory, number> = {
  self_harm: 4.0,
  pii: 3.0,
  harmful: 2.0,
  clean: 1.0
};

/**
 * Hard constraint gates. If any constraint is violated, the experiment is
 * discarded regardless of composite score improvement.
 *
 * Four independent recall floors — each with its own denominator, each
 * guarding a distinct failure mode. Three flagged-category recalls enforce
 * "don't miss bad content" (safety). clean_recall enforces "don't over-flag
 * good content" (UX). overall_precision is tracked as a KPI but not gated on;
 * it is largely downstream of these four.
 */
export const HARD_CONSTRAINTS = {
  self_harm_recall: 0.99, // don't miss self-harm
  pii_recall: 0.95, // don't miss PII
  harmful_recall: 0.92, // don't miss harmful
  clean_recall: 0.85 // don't over-flag clean content
} as const;

export type HardConstraintName = keyof typeof HARD_CONSTRAINTS;
