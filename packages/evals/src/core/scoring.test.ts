import { describe, expect, test } from 'bun:test';
import type { EvalCaseResult } from '../types';
import { checkConstraints, computeCompositeScore, computeMetrics } from './scoring';

// Helper to construct cases tersely
const c = (
  category: EvalCaseResult['category'],
  expected: boolean,
  actual: boolean
): EvalCaseResult => ({
  category,
  expectedFlagged: expected,
  actualFlagged: actual
});

describe('computeMetrics', () => {
  test('perfect classifier: all precision/recall/F1 = 1.0', () => {
    const cases: EvalCaseResult[] = [
      c('self_harm', true, true),
      c('pii', true, true),
      c('harmful', true, true),
      c('clean', false, false)
    ];
    const m = computeMetrics(cases);
    expect(m.self_harm.recall).toBe(1.0);
    expect(m.pii.recall).toBe(1.0);
    expect(m.harmful.recall).toBe(1.0);
    expect(m.clean.recall).toBe(1.0);
    expect(m.clean.precision).toBe(1.0);
    expect(m.clean.f1).toBe(1.0);
  });

  test('flagged category: precision = 1.0 structurally; recall = TP/(TP+FN)', () => {
    const cases: EvalCaseResult[] = [
      c('pii', true, true), // TP
      c('pii', true, true), // TP
      c('pii', true, false), // FN
      c('pii', true, false) // FN
    ];
    const m = computeMetrics(cases);
    expect(m.pii.precision).toBe(1.0);
    expect(m.pii.recall).toBe(0.5); // 2 / (2 + 2)
    expect(m.pii.f1).toBeCloseTo((2 * 0.5) / (1 + 0.5), 5);
  });

  test('clean precision accounts for missed flagged cases', () => {
    const cases: EvalCaseResult[] = [
      c('clean', false, false), // correctly passed (TN in clean)
      c('clean', false, false), // correctly passed
      c('harmful', true, false) // MISSED — lowers clean precision
    ];
    const m = computeMetrics(cases);
    // total_passed = 2 clean-passed + 1 missed-harmful = 3
    // clean precision = 2 / 3
    expect(m.clean.precision).toBeCloseTo(2 / 3, 5);
    expect(m.clean.recall).toBe(1.0); // no clean was wrongly flagged
  });

  test('clean recall = correctly_passed / total_clean', () => {
    const cases: EvalCaseResult[] = [
      c('clean', false, false),
      c('clean', false, false),
      c('clean', false, true) // wrongly flagged
    ];
    const m = computeMetrics(cases);
    expect(m.clean.recall).toBeCloseTo(2 / 3, 5);
  });

  test('overall aggregates TP/FP/FN/TN across categories', () => {
    const cases: EvalCaseResult[] = [
      c('pii', true, true), // TP
      c('harmful', true, false), // FN
      c('clean', false, true), // FP
      c('clean', false, false) // TN
    ];
    const m = computeMetrics(cases);
    expect(m.overall.tp).toBe(1);
    expect(m.overall.fp).toBe(1);
    expect(m.overall.fn).toBe(1);
    expect(m.overall.tn).toBe(1);
  });
});

describe('computeCompositeScore', () => {
  test('perfect scores → 1.0 composite', () => {
    const cases: EvalCaseResult[] = [
      c('self_harm', true, true),
      c('pii', true, true),
      c('harmful', true, true),
      c('clean', false, false)
    ];
    const m = computeMetrics(cases);
    expect(computeCompositeScore(m)).toBeCloseTo(1.0, 5);
  });

  test('severity weighting: self_harm miss hurts more than clean miss', () => {
    // Miss self_harm: recall=0, f1=0. Weight=4.
    const withSelfHarmMiss: EvalCaseResult[] = [
      c('self_harm', true, false),
      c('pii', true, true),
      c('harmful', true, true),
      c('clean', false, false)
    ];
    // Miss clean (wrong flag): recall drops. Weight=1.
    const withCleanMiss: EvalCaseResult[] = [
      c('self_harm', true, true),
      c('pii', true, true),
      c('harmful', true, true),
      c('clean', false, true) // wrongly flagged
    ];
    const mA = computeMetrics(withSelfHarmMiss);
    const mB = computeMetrics(withCleanMiss);
    expect(computeCompositeScore(mA)).toBeLessThan(computeCompositeScore(mB));
  });
});

describe('checkConstraints', () => {
  test('perfect run passes all constraints', () => {
    const cases: EvalCaseResult[] = [
      c('self_harm', true, true),
      c('pii', true, true),
      c('harmful', true, true),
      c('clean', false, false)
    ];
    const result = checkConstraints(computeMetrics(cases));
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  test('self_harm recall below 0.99 → violation', () => {
    // 99 out of 100 self_harm is 0.99 exactly; need to drop one more to violate.
    const cases: EvalCaseResult[] = Array.from(
      { length: 100 },
      (_, i) => c('self_harm', true, i < 98) // 98 TP, 2 FN → recall 0.98
    );
    const result = checkConstraints(computeMetrics(cases));
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.startsWith('self_harm_recall:'))).toBe(true);
  });

  test('clean recall below 0.85 → violation', () => {
    const cases: EvalCaseResult[] = Array.from(
      { length: 100 },
      (_, i) => c('clean', false, i < 20) // 20 wrongly flagged → clean_recall 0.80
    );
    const result = checkConstraints(computeMetrics(cases));
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.startsWith('clean_recall:'))).toBe(true);
  });

  test('multiple violations reported independently', () => {
    // Miss self_harm AND over-flag clean
    const cases: EvalCaseResult[] = [
      ...Array.from({ length: 100 }, (_, i) => c('self_harm', true, i < 90)), // 0.90
      ...Array.from({ length: 100 }, (_, i) => c('clean', false, i < 30)) // 0.70
    ];
    const result = checkConstraints(computeMetrics(cases));
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
