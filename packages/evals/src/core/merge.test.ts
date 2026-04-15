import { describe, expect, test } from 'bun:test';
import type { CategoryFlag, SingleCheckResult } from '../types';
import { mergeResults } from './merge';

const clean = (): SingleCheckResult => ({
  flagged: false,
  categories: [],
  explanation: null,
  error: null,
  latencyMs: 10,
  rawResponse: null
});

const errored = (msg: string): SingleCheckResult => ({
  flagged: false,
  categories: [],
  explanation: null,
  error: msg,
  latencyMs: 10,
  rawResponse: null
});

const flagged = (categories: CategoryFlag[]): SingleCheckResult => ({
  flagged: true,
  categories,
  explanation: null,
  error: null,
  latencyMs: 10,
  rawResponse: null
});

const piiPhone: CategoryFlag = {
  category: 'pii',
  subcategory: 'phone_number',
  confidence: 0.9
};
const harmfulHate: CategoryFlag = {
  category: 'harmful',
  subcategory: 'hate',
  confidence: 0.7
};

describe('mergeResults', () => {
  test('both clean → flagged=false, detectedBy=none', () => {
    const out = mergeResults(clean(), clean());
    expect(out.flagged).toBe(false);
    expect(out.categories).toEqual([]);
    expect(out.detectedBy).toBe('none');
  });

  test('both errored → flagged=false, detectedBy=none', () => {
    const out = mergeResults(errored('timeout'), errored('500'));
    expect(out.flagged).toBe(false);
    expect(out.detectedBy).toBe('none');
  });

  test('gemini flagged, openai clean → detectedBy=gemini', () => {
    const out = mergeResults(flagged([piiPhone]), clean());
    expect(out.flagged).toBe(true);
    expect(out.categories).toEqual([piiPhone]);
    expect(out.detectedBy).toBe('gemini');
  });

  test('openai flagged, gemini clean → detectedBy=openai', () => {
    const out = mergeResults(clean(), flagged([harmfulHate]));
    expect(out.flagged).toBe(true);
    expect(out.categories).toEqual([harmfulHate]);
    expect(out.detectedBy).toBe('openai');
  });

  test('both flagged, disjoint categories → detectedBy=both, both kept', () => {
    const out = mergeResults(flagged([piiPhone]), flagged([harmfulHate]));
    expect(out.flagged).toBe(true);
    expect(out.categories).toHaveLength(2);
    expect(out.detectedBy).toBe('both');
  });

  test('both flagged, overlapping categories → dedupe by (category, subcategory)', () => {
    const openaiHate: CategoryFlag = {
      category: 'harmful',
      subcategory: 'hate',
      confidence: 0.95 // different confidence, same key
    };
    const out = mergeResults(flagged([harmfulHate]), flagged([openaiHate]));
    expect(out.categories).toHaveLength(1);
    // Gemini's version wins the dedupe (first-in)
    expect(out.categories[0].confidence).toBe(0.7);
    expect(out.detectedBy).toBe('both');
  });

  test('errored provider is ignored in the merge', () => {
    const out = mergeResults(errored('HTTP 500'), flagged([harmfulHate]));
    expect(out.flagged).toBe(true);
    expect(out.categories).toEqual([harmfulHate]);
    expect(out.detectedBy).toBe('openai');
  });
});
