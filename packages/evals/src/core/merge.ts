/**
 * Either-can-veto merge logic for Gemini + OpenAI results.
 *
 * Ported from AlphaLearn `_merge_results`. Pure: no I/O, no imports beyond
 * types. Unit tests exercise the four `detectedBy` branches and the dedupe
 * path.
 */

import type { CategoryFlag, DetectedBy, SingleCheckResult } from '../types';

export interface MergeOutput {
  flagged: boolean;
  categories: CategoryFlag[];
  detectedBy: DetectedBy;
}

/**
 * Combine two provider results into a single flagged/categories/detectedBy
 * tuple. Severity and user-facing message are computed separately by
 * `severity.ts` — this module only handles the category-set logic.
 */
export function mergeResults(gemini: SingleCheckResult, openai: SingleCheckResult): MergeOutput {
  const categories: CategoryFlag[] = [];
  const detectedParts: string[] = [];

  if (!gemini.error && gemini.flagged) {
    categories.push(...gemini.categories);
    detectedParts.push('gemini');
  }

  if (!openai.error && openai.flagged) {
    // Dedupe on (category, subcategory) — either system can contribute
    // a category the other already flagged.
    const seen = new Set(categories.map((c) => `${c.category}|${c.subcategory}`));
    for (const cat of openai.categories) {
      const key = `${cat.category}|${cat.subcategory}`;
      if (!seen.has(key)) {
        categories.push(cat);
        seen.add(key);
      }
    }
    if (openai.categories.length > 0) {
      detectedParts.push('openai');
    }
  }

  const flagged = categories.length > 0;
  const detectedBy: DetectedBy =
    detectedParts.length === 0
      ? 'none'
      : detectedParts.length === 2
        ? 'both'
        : (detectedParts[0] as 'gemini' | 'openai');

  return { flagged, categories, detectedBy };
}
