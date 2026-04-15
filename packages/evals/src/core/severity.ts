/**
 * Severity determination + user-facing rejection messages.
 *
 * Ported from AlphaLearn `_determine_severity` and `_user_facing_message`.
 * Pure functions of (categories, source) → output. No I/O, no side effects.
 */

import type { CategoryFlag, ModerationSeverity, ModerationSource } from '../types';

/**
 * Highest severity across flagged categories.
 *
 *   self_harm         → critical (immediate escalation in the LMS system)
 *   harmful conf ≥ .8 → high
 *   harmful conf <  .8 → medium
 *   pii               → medium
 *   else              → low
 *
 * Takes categories directly so callers can compose with merge output.
 * Returns null for empty category list (caller should not be invoking
 * severity on clean content).
 */
export function determineSeverity(categories: CategoryFlag[]): ModerationSeverity | null {
  if (categories.length === 0) return null;

  const hasSelfHarm = categories.some((c) => c.category === 'self_harm');
  if (hasSelfHarm) return 'critical';

  const harmfulConfidences = categories
    .filter((c) => c.category === 'harmful')
    .map((c) => c.confidence);
  if (harmfulConfidences.length > 0) {
    const maxConfidence = Math.max(...harmfulConfidences);
    return maxConfidence >= 0.8 ? 'high' : 'medium';
  }

  const hasPii = categories.some((c) => c.category === 'pii');
  if (hasPii) return 'medium';

  return 'low';
}

/**
 * Kid-friendly rejection message keyed on the flagged categories and the
 * source surface (about_me vs. chat_message).
 *
 * PII takes priority (most common + most actionable for the student).
 * Self-harm includes Crisis Text Line. General harmful gets a neutral prompt.
 */
export function userFacingMessage(
  categories: CategoryFlag[],
  source: ModerationSource
): string | null {
  if (categories.length === 0) return null;

  const hasPii = categories.some((c) => c.category === 'pii');
  const hasSelfHarm = categories.some((c) => c.category === 'self_harm');

  const surface = source === 'chat_message' ? 'this message' : 'your bio';

  if (hasPii) {
    return (
      `Heads up — ${surface} might include personal info like a phone number, ` +
      `email, or school name. To keep everyone safe, we can't include that. ` +
      `Try again without it!`
    );
  }

  if (hasSelfHarm) {
    return (
      `We noticed some content that we want to make sure you're okay about. ` +
      `If you're going through a tough time, please talk to a trusted adult. ` +
      `You can also reach the Crisis Text Line by texting HOME to 741741.`
    );
  }

  return source === 'chat_message'
    ? `This message can't be sent. Try rephrasing without sensitive language.`
    : `This content can't be used in your bio. Try describing your interests, hobbies, or favorite things instead!`;
}
