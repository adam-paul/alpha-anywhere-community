/**
 * OpenAI omni-moderation provider.
 *
 * Calls `api.openai.com/v1/moderations` directly via `fetch` (no SDK).
 * The endpoint is free (no API credits charged) per OpenAI docs.
 * Applies per-category thresholds from the optimization surface on top of
 * OpenAI's own flagged-booleans — we can only be MORE conservative, not
 * less.
 */

import { OPENAI_CATEGORY_THRESHOLDS } from '../core/config';
import type {
  CategoryFlag,
  FlaggedCategory,
  ModerationSubcategory,
  Provider,
  ProviderCheckOptions,
  SingleCheckResult
} from '../types';

const OPENAI_URL = 'https://api.openai.com/v1/moderations';
const OPENAI_MODEL = 'omni-moderation-latest';

const SELF_HARM_CATEGORIES = new Set(['self-harm', 'self-harm/intent', 'self-harm/instructions']);

const HARMFUL_CATEGORIES = new Set([
  'hate',
  'hate/threatening',
  'harassment',
  'harassment/threatening',
  'violence',
  'violence/graphic',
  'sexual',
  'sexual/minors',
  'illicit',
  'illicit/violent'
]);

interface OpenAIModerationResponse {
  results?: Array<{
    flagged: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
}

export function createOpenAIProvider({ apiKey }: { apiKey: string }): Provider {
  return {
    name: 'openai',
    async check(text: string, opts: ProviderCheckOptions): Promise<SingleCheckResult> {
      // `opts.source` is not used — the OpenAI moderation endpoint is source-agnostic.
      void opts.source;

      const start = Date.now();

      if (!apiKey) {
        return errorResult('OPENAI_API_KEY not configured', Date.now() - start);
      }

      let response: Response;
      try {
        response = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: OPENAI_MODEL, input: text }),
          signal: opts.signal
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return errorResult(msg, Date.now() - start);
      }

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return errorResult(`HTTP ${response.status}: ${body.slice(0, 200)}`, latencyMs);
      }

      let data: OpenAIModerationResponse;
      try {
        data = (await response.json()) as OpenAIModerationResponse;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return errorResult(`JSON parse: ${msg}`, latencyMs);
      }

      const result = data.results?.[0];
      if (!result) {
        return errorResult('No results in OpenAI response', latencyMs, data);
      }

      const categories: CategoryFlag[] = [];
      const scores = result.category_scores ?? {};
      const flags = result.categories ?? {};

      for (const [name, isFlagged] of Object.entries(flags)) {
        if (!isFlagged) continue;

        const score = scores[name] ?? 0;

        // Apply our per-category threshold on top of OpenAI's boolean.
        // Unknown categories (if OpenAI adds new ones): keep them so we
        // don't silently drop a new signal.
        const threshold = OPENAI_CATEGORY_THRESHOLDS[name];
        if (threshold !== undefined && score < threshold) continue;

        if (SELF_HARM_CATEGORIES.has(name)) {
          categories.push({
            category: 'self_harm' as FlaggedCategory,
            subcategory: mapOpenAISubcategory(name, 'self_harm'),
            confidence: score
          });
        } else if (HARMFUL_CATEGORIES.has(name)) {
          categories.push({
            category: 'harmful' as FlaggedCategory,
            subcategory: mapOpenAISubcategory(name, 'harmful'),
            confidence: score
          });
        }
        // Unknown categories are kept with a best-effort mapping.
      }

      return {
        flagged: categories.length > 0,
        categories,
        explanation: null, // OpenAI moderation endpoint doesn't return prose
        error: null,
        latencyMs,
        rawResponse: {
          flagged: result.flagged,
          categories: flags,
          category_scores: scores
        }
      };
    }
  };
}

/**
 * Map OpenAI category names to our subcategory taxonomy.
 *
 *   self-harm/* → self_harm subcategory (ideation, intent, instructions)
 *   violence*    → violence
 *   sexual*      → sexual
 *   hate*        → hate
 *   harassment*  → harassment
 *   illicit*     → illicit
 *
 * For compound names we drop the slash variant; the domain taxonomy doesn't
 * distinguish "threatening" vs. base forms.
 */
function mapOpenAISubcategory(
  openaiName: string,
  kind: 'self_harm' | 'harmful'
): ModerationSubcategory {
  if (kind === 'self_harm') {
    if (openaiName === 'self-harm/intent') return 'intent';
    if (openaiName === 'self-harm/instructions') return 'instructions';
    return 'ideation';
  }

  if (openaiName.startsWith('violence')) return 'violence';
  if (openaiName.startsWith('sexual')) return 'sexual';
  if (openaiName.startsWith('hate')) return 'hate';
  if (openaiName.startsWith('harassment')) return 'harassment';
  if (openaiName.startsWith('illicit')) return 'illicit';
  return 'hate'; // conservative fallback — kept as a flag, not silently dropped
}

function errorResult(error: string, latencyMs: number, raw?: unknown): SingleCheckResult {
  return {
    flagged: false,
    categories: [],
    explanation: null,
    error,
    latencyMs,
    rawResponse: raw
  };
}
