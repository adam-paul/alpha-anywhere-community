/**
 * Corpus loader + validator.
 *
 * Handles the bundled JSON corpus files (`packages/evals/corpus/*.json`).
 * Ports AlphaLearn `corpus/schema.py` — hand-rolled validation (no Zod), same
 * set of checks. Uses Node `fs` + `crypto`; not Worker-compatible — the
 * harness runs under Bun via the CLI, not inside Workers.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import {
  CLEAN_SUBCATEGORIES,
  HARMFUL_SUBCATEGORIES,
  PII_SUBCATEGORIES,
  SELF_HARM_SUBCATEGORIES,
  type ModerationCategory,
  type ModerationSource,
  type ModerationSubcategory
} from '../types';

export type CorpusDifficulty = 'easy' | 'medium' | 'hard';

export interface CorpusCase {
  id: string;
  input_text: string;
  expected_flagged: boolean;
  category: ModerationCategory;
  subcategory: ModerationSubcategory;
  difficulty: CorpusDifficulty;
  source: string;
  source_type: ModerationSource;
  notes?: string;
}

export const VALID_CATEGORIES = new Set<ModerationCategory>([
  'self_harm',
  'pii',
  'harmful',
  'clean'
]);

export const VALID_SUBCATEGORIES: Record<ModerationCategory, Set<ModerationSubcategory>> = {
  self_harm: new Set(SELF_HARM_SUBCATEGORIES),
  pii: new Set(PII_SUBCATEGORIES),
  harmful: new Set(HARMFUL_SUBCATEGORIES),
  clean: new Set(CLEAN_SUBCATEGORIES)
};

const VALID_DIFFICULTIES = new Set<CorpusDifficulty>(['easy', 'medium', 'hard']);
const VALID_SOURCE_TYPES = new Set<ModerationSource>(['about_me', 'chat_message']);

/** Returns a list of validation errors. Empty means the corpus is valid. */
export function validateCorpus(cases: unknown): string[] {
  const errors: string[] = [];

  if (!Array.isArray(cases)) {
    return [`Corpus must be a JSON array, got ${typeof cases}`];
  }

  const seenInputs = new Set<string>();

  cases.forEach((raw, i) => {
    const prefix = `Case ${i}`;

    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${prefix}: not an object`);
      return;
    }
    const c = raw as Record<string, unknown>;

    for (const field of [
      'id',
      'input_text',
      'expected_flagged',
      'category',
      'subcategory',
      'difficulty',
      'source_type'
    ] as const) {
      if (!(field in c)) errors.push(`${prefix}: missing field '${field}'`);
    }

    if (typeof c.input_text !== 'string' || c.input_text.trim().length === 0) {
      errors.push(`${prefix}: input_text must be a non-empty string`);
    } else if (seenInputs.has(c.input_text)) {
      errors.push(`${prefix}: duplicate input_text`);
    } else {
      seenInputs.add(c.input_text);
    }

    if (typeof c.expected_flagged !== 'boolean') {
      errors.push(`${prefix}: expected_flagged must be bool`);
    }

    const category = c.category as ModerationCategory;
    if (!VALID_CATEGORIES.has(category)) {
      errors.push(`${prefix}: invalid category '${String(c.category)}'`);
    } else if (typeof c.subcategory === 'string') {
      const allowed = VALID_SUBCATEGORIES[category];
      if (!allowed.has(c.subcategory as ModerationSubcategory)) {
        errors.push(`${prefix}: invalid subcategory '${c.subcategory}' for category '${category}'`);
      }
    }

    if (!VALID_DIFFICULTIES.has(c.difficulty as CorpusDifficulty)) {
      errors.push(`${prefix}: invalid difficulty '${String(c.difficulty)}'`);
    }

    if (!VALID_SOURCE_TYPES.has(c.source_type as ModerationSource)) {
      errors.push(`${prefix}: invalid source_type '${String(c.source_type)}'`);
    }
  });

  return errors;
}

/** Load + validate a corpus JSON from disk. Throws on validation failure. */
export function loadCorpus(path: string): CorpusCase[] {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const errors = validateCorpus(parsed);
  if (errors.length > 0) {
    const msg =
      `Corpus validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n` +
      errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(msg);
  }
  return parsed as CorpusCase[];
}

/**
 * Short (16-char) sha256 prefix over the corpus content. Used to attribute
 * eval runs to a specific corpus state; mirrors AlphaLearn's `corpus_hash`.
 * Stable-serializes the cases (sorted keys) so whitespace doesn't shift it.
 */
export function corpusHash(cases: CorpusCase[]): string {
  const stable = JSON.stringify(cases, Object.keys(cases[0] ?? {}).sort());
  return createHash('sha256').update(stable).digest('hex').slice(0, 16);
}
