/**
 * Gemini 2.0 Flash provider — structured-JSON classification.
 *
 * Calls `generativelanguage.googleapis.com` directly via `fetch` (no SDK).
 * All Gemini-native safety settings set to BLOCK_NONE so the classifier
 * can see every input; our prompt does the actual categorization.
 */

import { GEMINI_TEMPERATURE } from '../core/config';
import { prompts } from '../prompts';
import type {
  CategoryFlag,
  FlaggedCategory,
  ModerationSubcategory,
  Provider,
  ProviderCheckOptions,
  SingleCheckResult
} from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
];

const GENERATION_CONFIG = {
  responseMimeType: 'application/json',
  temperature: GEMINI_TEMPERATURE,
  candidateCount: 1
};

/** finishReason values that indicate Gemini's own safety layer blocked output. */
const SAFETY_BLOCKED_REASONS = new Set([
  'PROHIBITED_CONTENT',
  'SAFETY',
  'BLOCKED_REASON_UNSPECIFIED'
]);

interface GeminiClassification {
  flagged: boolean;
  categories?: Array<{
    category?: string;
    subcategory?: string;
    confidence?: number;
  }>;
  explanation?: string | null;
}

/**
 * Strip any <user_content> tags the user might have pasted — the classifier
 * wraps real input in such tags, so we neutralize duplicates to prevent
 * prompt-boundary confusion.
 */
function sanitizeInput(text: string): string {
  return text.replace(/<\/?user_content>/gi, '[tag]').trim();
}

export function createGeminiProvider({ apiKey }: { apiKey: string }): Provider {
  return {
    name: 'gemini',
    async check(text: string, opts: ProviderCheckOptions): Promise<SingleCheckResult> {
      const start = Date.now();

      if (!apiKey) {
        return errorResult('GEMINI_API_KEY not configured', Date.now() - start);
      }

      const systemPrompt = prompts[opts.source];
      const userContent = `<user_content>\n${sanitizeInput(text)}\n</user_content>`;

      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: GENERATION_CONFIG,
        safetySettings: SAFETY_SETTINGS
      };

      let response: Response;
      try {
        response = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
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

      let data: unknown;
      try {
        data = await response.json();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return errorResult(`JSON parse (envelope): ${msg}`, latencyMs);
      }

      const envelope = data as {
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const candidate = envelope.candidates?.[0];
      if (!candidate) {
        return errorResult('No candidates in Gemini response', latencyMs, data);
      }

      // If Gemini's own safety layer blocked the content, treat it as flagged.
      if (candidate.finishReason && SAFETY_BLOCKED_REASONS.has(candidate.finishReason)) {
        return {
          flagged: true,
          categories: [
            {
              category: 'harmful' as FlaggedCategory,
              subcategory: 'hate' as ModerationSubcategory, // safest mapping; the real signal is "Gemini refused"
              confidence: 1.0
            }
          ],
          explanation: `Gemini safety filter: ${candidate.finishReason}`,
          error: null,
          latencyMs,
          rawResponse: data
        };
      }

      const textPart = candidate.content?.parts?.find((p) => typeof p.text === 'string')?.text;
      if (!textPart) {
        return errorResult('No text in Gemini response parts', latencyMs, data);
      }

      let classification: GeminiClassification;
      try {
        classification = JSON.parse(textPart) as GeminiClassification;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return errorResult(
          `JSON parse (classification): ${msg}`,
          latencyMs,
          textPart.slice(0, 500)
        );
      }

      const categories = normalizeGeminiCategories(classification.categories ?? []);

      return {
        flagged: Boolean(classification.flagged),
        categories,
        explanation: classification.explanation ?? null,
        error: null,
        latencyMs,
        rawResponse: classification
      };
    }
  };
}

/**
 * Gemini returns categories as free-form strings. Coerce to our typed shapes
 * and drop anything that doesn't map cleanly — better to under-flag than to
 * emit an ill-typed value downstream.
 */
function normalizeGeminiCategories(
  raw: Array<{ category?: string; subcategory?: string; confidence?: number }>
): CategoryFlag[] {
  const out: CategoryFlag[] = [];
  for (const r of raw) {
    const cat = r.category;
    const sub = r.subcategory;
    if (cat !== 'harmful' && cat !== 'pii' && cat !== 'self_harm') continue;
    if (typeof sub !== 'string' || sub.length === 0) continue;
    out.push({
      category: cat as FlaggedCategory,
      subcategory: sub as ModerationSubcategory,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5
    });
  }
  return out;
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
