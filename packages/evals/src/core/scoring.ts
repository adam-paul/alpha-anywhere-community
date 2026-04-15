/**
 * Composite scoring engine for content moderation evals.
 *
 * Pure TypeScript port of AlphaLearn `scoring.py`. No I/O, no framework
 * dependencies. Exercised by Plan B's eval harness; shipped in Plan A so
 * the package's core is complete and independently testable.
 *
 * Per-category metric semantics (as in AlphaLearn):
 *
 *   Flagged categories (self_harm, pii, harmful): every case has
 *   expected_flagged=true. Recall is the meaningful metric. Precision is
 *   structurally 1.0 (no false positives possible within the category
 *   alone). F1 simplifies to 2R/(1+R).
 *
 *   Clean: every case has expected_flagged=false. Positive class is
 *   "not flagged." Precision = (clean not flagged) / (all not flagged),
 *   where "all not flagged" includes missed flagged cases across all
 *   flagged categories. Recall = (clean not flagged) / (total clean).
 */

import type {
  CategoryMetrics,
  ConstraintCheckResult,
  EvalCaseResult,
  MetricsByCategory
} from '../types';
import { CATEGORY_WEIGHTS, HARD_CONSTRAINTS } from './config';
import type { HardConstraintName } from './config';

interface Counts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

function emptyCounts(): Counts {
  return { tp: 0, fp: 0, fn: 0, tn: 0 };
}

/**
 * Compute per-category confusion matrix and precision/recall/F1 from eval
 * results. Includes an "overall" key with aggregate counts.
 */
export function computeMetrics(results: EvalCaseResult[]): MetricsByCategory {
  // Phase 1: per-category confusion matrix
  const byCat = new Map<string, Counts>();
  const getBucket = (key: string): Counts => {
    let bucket = byCat.get(key);
    if (!bucket) {
      bucket = emptyCounts();
      byCat.set(key, bucket);
    }
    return bucket;
  };

  for (const r of results) {
    const bucket = getBucket(r.category);
    if (r.expectedFlagged && r.actualFlagged) bucket.tp++;
    else if (!r.expectedFlagged && r.actualFlagged) bucket.fp++;
    else if (r.expectedFlagged && !r.actualFlagged) bucket.fn++;
    else bucket.tn++;
  }

  const metrics: MetricsByCategory = {};

  // Phase 2: flagged categories — recall is meaningful, precision is 1.0
  for (const [cat, c] of byCat.entries()) {
    if (cat === 'clean') continue;
    const denom = c.tp + c.fn;
    const recall = denom > 0 ? c.tp / denom : 1.0;
    const f1 = recall > 0 ? (2 * recall) / (1 + recall) : 0.0;
    metrics[cat] = {
      tp: c.tp,
      fp: c.fp,
      fn: c.fn,
      tn: c.tn,
      precision: 1.0,
      recall,
      f1
    };
  }

  // Phase 3: clean — positive class is "not flagged"
  const cleanCounts = byCat.get('clean');
  if (cleanCounts) {
    const correctlyPassed = cleanCounts.tn; // truly clean AND not flagged
    const wronglyFlagged = cleanCounts.fp; // truly clean but flagged
    const totalClean = correctlyPassed + wronglyFlagged;

    // Everything the system let through: clean correctly passed + missed
    // flagged cases (FNs) across all flagged categories.
    let missedFlagged = 0;
    for (const key of Object.keys(metrics)) {
      missedFlagged += metrics[key].fn;
    }
    const totalPassed = correctlyPassed + missedFlagged;

    const precision = totalPassed > 0 ? correctlyPassed / totalPassed : 1.0;
    const recall = totalClean > 0 ? correctlyPassed / totalClean : 1.0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;

    metrics.clean = {
      tp: cleanCounts.tp,
      fp: wronglyFlagged,
      fn: cleanCounts.fn,
      tn: correctlyPassed,
      precision,
      recall,
      f1
    };
  }

  // Phase 4: overall binary classification (flagged = positive)
  const overall: Counts = emptyCounts();
  for (const c of byCat.values()) {
    overall.tp += c.tp;
    overall.fp += c.fp;
    overall.fn += c.fn;
    overall.tn += c.tn;
  }
  const overallPrecision =
    overall.tp + overall.fp > 0 ? overall.tp / (overall.tp + overall.fp) : 1.0;
  const overallRecall = overall.tp + overall.fn > 0 ? overall.tp / (overall.tp + overall.fn) : 1.0;
  const overallF1 =
    overallPrecision + overallRecall > 0
      ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
      : 0.0;

  metrics.overall = {
    ...overall,
    precision: overallPrecision,
    recall: overallRecall,
    f1: overallF1
  } satisfies CategoryMetrics;

  return metrics;
}

/**
 * Severity-weighted F1 across categories. Categories not present in
 * CATEGORY_WEIGHTS are ignored. Returns 0.0 if no weighted categories have
 * results.
 */
export function computeCompositeScore(metrics: MetricsByCategory): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const row = metrics[category];
    if (row) {
      weightedSum += weight * row.f1;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.0;
}

/**
 * Check hard safety constraints against computed metrics. Returns
 * { passed, violations } where violations is a list of human-readable
 * strings describing each violated constraint.
 */
export function checkConstraints(metrics: MetricsByCategory): ConstraintCheckResult {
  const violations: string[] = [];

  const constraintMap: Record<HardConstraintName, [string, keyof CategoryMetrics]> = {
    self_harm_recall: ['self_harm', 'recall'],
    pii_recall: ['pii', 'recall'],
    harmful_recall: ['harmful', 'recall'],
    clean_recall: ['clean', 'recall']
  };

  for (const [name, threshold] of Object.entries(HARD_CONSTRAINTS) as [
    HardConstraintName,
    number
  ][]) {
    const [category, metricName] = constraintMap[name];
    const row = metrics[category];
    if (!row) continue;
    const actual = row[metricName] as number;
    if (actual < threshold) {
      violations.push(`${name}: ${actual.toFixed(4)} < ${threshold.toFixed(4)}`);
    }
  }

  return { passed: violations.length === 0, violations };
}
