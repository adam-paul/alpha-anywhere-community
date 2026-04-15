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

export type SelfHarmSubcategory = 'ideation' | 'intent' | 'instructions';

export type PiiSubcategory =
  | 'phone_number'
  | 'email_address'
  | 'social_media'
  | 'physical_address'
  | 'school_name'
  | 'full_name'
  | 'off_platform_contact';

export type HarmfulSubcategory =
  | 'hate'
  | 'harassment'
  | 'threat'
  | 'sexual'
  | 'profanity'
  | 'grooming'
  | 'violence'
  | 'illicit';

export type CleanSubcategory =
  | 'hobbies'
  | 'sports'
  | 'animals'
  | 'creative'
  | 'gaming_language'
  | 'hyperbole'
  | 'idiomatic'
  | 'metaphorical_violence'
  | 'pii_adjacent_allowed';

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
export type ModerationSource = 'about_me' | 'chat_message';

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

/** Result of merging both providers (either-can-veto). */
export interface MergedModerationResult {
  flagged: boolean;
  categories: CategoryFlag[];
  severity: ModerationSeverity | null;
  userMessage: string | null;
  detectedBy: DetectedBy;
}

/**
 * Three possible outcomes of a moderation call. `unavailable` means both
 * providers errored; the caller should reject the write but distinguish the
 * reason in UX (generic "try again") and not persist a moderation_events
 * row (nothing was actually flagged).
 */
export type ModerationStatusOutcome = 'clean' | 'flagged' | 'unavailable';

/**
 * What the evaluator returns to the caller.
 *
 * `gemini` and `openai` carry the raw provider results so the callsite can
 * persist them to moderation_events.detection_details without re-running.
 */
export interface ModerationDecision extends MergedModerationResult {
  status: ModerationStatusOutcome;
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
