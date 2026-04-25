/**
 * Public types for @alpha/evals.
 *
 * Exposed via the `./types` subpath export so consumers can import domain
 * unions without pulling in the full package (providers, evaluator, etc.).
 * This is the single home for moderation-domain unions — D1 row types
 * (DbMessage.moderation_status, DbModerationEvent.category, etc.) and
 * app types reference these, never redeclare them.
 */

// =============================================================================
// Taxonomy — matches AlphaLearn corpus schema (4 categories × 27 subcategories)
// =============================================================================

export type ModerationCategory = 'self_harm' | 'pii' | 'harmful' | 'clean';

/** Categories that produce a moderation flag. Clean content produces no flag. */
export type FlaggedCategory = Exclude<ModerationCategory, 'clean'>;

// Subcategory enums are declared as `as const` arrays so the harness can do
// runtime validation against the same source the TS types derive from. Single
// source, drift-proof.
export const SELF_HARM_SUBCATEGORIES = ['ideation', 'intent', 'instructions'] as const;

export const PII_SUBCATEGORIES = [
  'phone_number',
  'email_address',
  'social_media',
  'physical_address',
  'school_name',
  'full_name',
  'off_platform_contact'
] as const;

export const HARMFUL_SUBCATEGORIES = [
  'hate',
  'harassment',
  'threat',
  'sexual',
  'profanity',
  'grooming',
  'violence',
  'illicit'
] as const;

export const CLEAN_SUBCATEGORIES = [
  'hobbies',
  'sports',
  'animals',
  'creative',
  'gaming_language',
  'hyperbole',
  'idiomatic',
  'metaphorical_violence',
  'pii_adjacent_allowed'
] as const;

export type SelfHarmSubcategory = (typeof SELF_HARM_SUBCATEGORIES)[number];
export type PiiSubcategory = (typeof PII_SUBCATEGORIES)[number];
export type HarmfulSubcategory = (typeof HARMFUL_SUBCATEGORIES)[number];
export type CleanSubcategory = (typeof CLEAN_SUBCATEGORIES)[number];

export type ModerationSubcategory =
  | SelfHarmSubcategory
  | PiiSubcategory
  | HarmfulSubcategory
  | CleanSubcategory;

// =============================================================================
// Status, severity, source
// =============================================================================

/** Lifecycle status on a D1 row (messages.moderation_status). */
export type ModerationStatus = 'clean' | 'flagged' | 'reviewed' | 'removed';

export type ModerationSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Which moderation prompt to apply. Add new sources as new surfaces are added. */
export const MODERATION_SOURCES = ['about_me', 'chat_message'] as const;
export type ModerationSource = (typeof MODERATION_SOURCES)[number];

export type DetectedBy = 'gemini' | 'openai' | 'both' | 'none';

// =============================================================================
// Result shapes
// =============================================================================

export interface CategoryFlag {
  category: FlaggedCategory;
  subcategory: ModerationSubcategory;
  confidence: number;
}

/** Result of a single provider check (Gemini or OpenAI). Never thrown — errors are captured. */
export interface SingleCheckResult {
  flagged: boolean;
  categories: CategoryFlag[];
  explanation: string | null;
  error: string | null;
  latencyMs: number;
  rawResponse: unknown;
}

/**
 * What the evaluator returns to the caller.
 *
 * `status` discriminates three outcomes:
 *   - 'clean': nothing flagged; caller proceeds with the write.
 *   - 'flagged': one or both providers flagged; caller persists a
 *     `moderation_events` row and returns a rejection response.
 *   - 'unavailable': both providers errored; caller rejects with a generic
 *     "try again" message and does NOT persist a moderation_events row.
 *
 * `gemini` and `openai` carry the raw provider results so the callsite can
 * persist them to moderation_events.detection_details without re-running.
 */
export interface ModerationDecision {
  status: 'clean' | 'flagged' | 'unavailable';
  flagged: boolean;
  categories: CategoryFlag[];
  severity: ModerationSeverity | null;
  userMessage: string | null;
  detectedBy: DetectedBy;
  latencyMs: number;
  gemini: SingleCheckResult;
  openai: SingleCheckResult;
}

// =============================================================================
// Evaluator API
// =============================================================================

export interface EvaluatorConfig {
  geminiKey: string;
  openaiKey: string;
  /** Override per-provider timeout (ms). Defaults to 5000. */
  timeoutMs?: number;
}

export interface Evaluator {
  moderate(text: string, source: ModerationSource): Promise<ModerationDecision>;
}

// =============================================================================
// Provider API — contract both Gemini and OpenAI impls satisfy
// =============================================================================

export interface ProviderCheckOptions {
  source: ModerationSource;
  signal: AbortSignal;
}

export interface Provider {
  readonly name: 'gemini' | 'openai';
  /**
   * Never throws — failures (timeout, HTTP error, parse error) become
   * `SingleCheckResult.error`. Preserves independent fate-tracking when
   * the evaluator runs providers in parallel.
   */
  check(text: string, opts: ProviderCheckOptions): Promise<SingleCheckResult>;
}

// =============================================================================
// Scoring (used by Plan B's eval harness; exported for the core module's consumers)
// =============================================================================

/** One row of eval output for a single corpus case. */
export interface EvalCaseResult {
  category: ModerationCategory;
  expectedFlagged: boolean;
  actualFlagged: boolean;
}

export interface CategoryMetrics {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
}

export type MetricsByCategory = Record<string, CategoryMetrics>;

export interface ConstraintCheckResult {
  passed: boolean;
  violations: string[];
}

// =============================================================================
// Eval harness corpus
// =============================================================================

/** Which corpus partition an eval run targets. Mirrors the CHECK on eval_runs.corpus_set. */
export type CorpusSet = 'optimize' | 'holdout';
