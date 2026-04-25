#!/usr/bin/env bun
/**
 * Eval harness CLI.
 *
 * Loads a bundled corpus (optimize or holdout), runs it through the live
 * moderation pipeline, prints parseable metrics (matching AlphaLearn's
 * format), and optionally persists an eval_runs + eval_case_results set to
 * D1 via wrangler.
 *
 * Usage:
 *   bun run eval:moderation                                # optimize set, local D1
 *   bun run eval:moderation --set holdout                  # holdout set
 *   bun run eval:moderation --parallel 8                   # more workers
 *   bun run eval:moderation --verbose                      # per-case stream
 *   bun run eval:moderation --save                         # persist run
 *   bun run eval:moderation --save --remote                # persist to remote D1
 *
 * Env requires: GEMINI_API_KEY, OPENAI_API_KEY. Bun auto-loads .env.
 */

import { $ } from 'bun';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createEvaluator } from '@alpha/evals';
import {
  corpusHash as computeCorpusHash,
  loadCorpus,
  runEval,
  type SingleCaseResult
} from '@alpha/evals/harness';
import type { CorpusSet, MetricsByCategory } from '@alpha/evals/types';

interface Args {
  set: CorpusSet;
  parallel: number;
  verbose: boolean;
  save: boolean;
  remote: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
  };
  const set = get('--set') ?? 'optimize';
  if (set !== 'optimize' && set !== 'holdout') {
    console.error(`--set must be 'optimize' or 'holdout', got '${set}'`);
    process.exit(2);
  }
  const parallel = Number(get('--parallel') ?? 4);
  if (!Number.isFinite(parallel) || parallel < 1) {
    console.error(`--parallel must be a positive number`);
    process.exit(2);
  }
  return {
    set,
    parallel,
    verbose: argv.includes('--verbose'),
    save: argv.includes('--save'),
    remote: argv.includes('--remote')
  };
}

function sqlEscape(value: string | number | null): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

function printPerCategoryMetrics(title: string, metrics: MetricsByCategory, prefix: string) {
  console.log(`=== ${title} ===`);
  for (const category of ['self_harm', 'pii', 'harmful', 'clean']) {
    const m = metrics[category];
    if (!m) continue;
    const key = prefix ? `${prefix}_${category}` : category;
    console.log(`${key}_precision: ${m.precision.toFixed(4)}`);
    console.log(`${key}_recall: ${m.recall.toFixed(4)}`);
    console.log(`${key}_f1: ${m.f1.toFixed(4)}`);
  }
}

function buildSaveSQL(
  runId: string,
  args: Args,
  report: {
    compositeScore: number;
    constraintsPassed: boolean;
    constraintViolations: string[];
    mergedMetrics: MetricsByCategory;
    geminiMetrics: MetricsByCategory;
    openaiMetrics: MetricsByCategory;
    evalTimeS: number;
    avgLatencyMs: number;
    evalErrors: number;
    corpusSize: number;
    corpusHash: string;
    caseResults: SingleCaseResult[];
  },
  caseInputTextById: Map<string, string>
): string {
  const runInsert = `INSERT INTO eval_runs (
  id, corpus_set, corpus_size, corpus_hash, composite_score,
  constraints_passed, constraint_violations, metrics, gemini_metrics, openai_metrics,
  eval_time_s, avg_latency_ms, eval_errors, triggered_by
) VALUES (
  ${sqlEscape(runId)},
  ${sqlEscape(args.set)},
  ${report.corpusSize},
  ${sqlEscape(report.corpusHash)},
  ${report.compositeScore},
  ${report.constraintsPassed ? 1 : 0},
  ${sqlEscape(JSON.stringify(report.constraintViolations))},
  ${sqlEscape(JSON.stringify(report.mergedMetrics))},
  ${sqlEscape(JSON.stringify(report.geminiMetrics))},
  ${sqlEscape(JSON.stringify(report.openaiMetrics))},
  ${report.evalTimeS},
  ${report.avgLatencyMs},
  ${report.evalErrors},
  'manual'
);`;

  const caseInserts = report.caseResults
    .map(
      (r) => `INSERT INTO eval_case_results (
  run_id, case_id, input_text, expected_flagged, category, subcategory,
  actual_flagged, gemini_flagged, openai_flagged, merged_flagged,
  detected_by, latency_ms, gemini_error, openai_error
) VALUES (
  ${sqlEscape(runId)},
  ${sqlEscape(r.case_id)},
  ${sqlEscape(caseInputTextById.get(r.case_id) ?? '')},
  ${r.expected_flagged ? 1 : 0},
  ${sqlEscape(r.category)},
  ${sqlEscape(r.subcategory)},
  ${r.merged_flagged ? 1 : 0},
  ${r.gemini_error ? 'NULL' : r.gemini_flagged ? 1 : 0},
  ${r.openai_error ? 'NULL' : r.openai_flagged ? 1 : 0},
  ${r.merged_flagged ? 1 : 0},
  ${sqlEscape(r.detected_by)},
  ${r.latency_ms},
  ${sqlEscape(r.gemini_error)},
  ${sqlEscape(r.openai_error)}
);`
    )
    .join('\n');

  return [runInsert, caseInserts].join('\n\n');
}

async function main() {
  const args = parseArgs();

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey || !openaiKey) {
    console.error('GEMINI_API_KEY and OPENAI_API_KEY must be set in .env');
    process.exit(1);
  }

  // Corpus lives next to the package source, resolved relative to this script.
  const corpusPath = join(import.meta.dir, '..', 'packages', 'evals', 'corpus', `${args.set}.json`);

  console.log(`Loading corpus: ${corpusPath}`);
  const cases = loadCorpus(corpusPath);
  const hash = computeCorpusHash(cases);
  const caseInputTextById = new Map(cases.map((c) => [c.id, c.input_text]));
  console.log(`Loaded ${cases.length} cases (hash: ${hash})`);
  console.log(`Running with ${args.parallel} workers...\n`);

  const evaluator = createEvaluator({ geminiKey, openaiKey });

  const report = await runEval({
    evaluator,
    cases,
    corpusHash: hash,
    parallel: args.parallel,
    onCaseComplete: args.verbose
      ? (r, completed, total) => {
          const correct = r.expected_flagged === r.merged_flagged;
          const mark = correct ? '+' : 'X';
          const eg = r.gemini_error ? 'E' : r.gemini_flagged ? 'F' : 'C';
          const eo = r.openai_error ? 'E' : r.openai_flagged ? 'F' : 'C';
          console.log(
            `  [${mark}] (${completed}/${total}) ${r.case_id}: ` +
              `expected=${r.expected_flagged ? 'flagged' : 'clean'}, ` +
              `got=${r.merged_flagged ? 'flagged' : 'clean'} ` +
              `(g=${eg}, o=${eo}) ${r.latency_ms}ms`
          );
        }
      : undefined
  });

  // Misclassification summary
  const wrong = report.caseResults.filter((r) => r.expected_flagged !== r.merged_flagged);
  if (wrong.length > 0) {
    console.log(`\n--- ${wrong.length} MISCLASSIFIED ---`);
    for (const r of wrong) {
      const dir = r.expected_flagged ? 'FALSE NEG' : 'FALSE POS';
      console.log(
        `  [${dir}] ${r.case_id} (${r.category}/${r.subcategory}) ` +
          `g=${r.gemini_flagged ? 'F' : 'C'} o=${r.openai_flagged ? 'F' : 'C'}`
      );
    }
  }

  console.log('');
  printPerCategoryMetrics('GEMINI ONLY', report.geminiMetrics, 'gemini');
  console.log('');
  printPerCategoryMetrics('OPENAI ONLY', report.openaiMetrics, 'openai');
  console.log('');
  printPerCategoryMetrics('MERGED (PRODUCTION)', report.mergedMetrics, '');

  console.log(`composite_score: ${report.compositeScore.toFixed(4)}`);
  console.log(`constraints_passed: ${report.constraintsPassed ? 'true' : 'false'}`);
  for (const v of report.constraintViolations) console.log(`  VIOLATED: ${v}`);

  console.log('');
  console.log(`corpus_size: ${report.corpusSize}`);
  console.log(`corpus_hash: ${report.corpusHash}`);
  console.log(`eval_errors: ${report.evalErrors}`);
  console.log(`eval_time_s: ${report.evalTimeS.toFixed(1)}`);
  console.log(`avg_latency_ms: ${Math.round(report.avgLatencyMs)}`);

  if (args.save) {
    const runId = randomUUID();
    const sql = buildSaveSQL(runId, args, report, caseInputTextById);
    const tmpFile = `/tmp/eval-run-${Date.now()}.sql`;
    await Bun.write(tmpFile, sql);

    const wranglerArgs = args.remote ? '--remote' : '--local';
    console.log(`\nPersisting run to ${args.remote ? 'remote' : 'local'} D1...`);
    await $`bunx wrangler d1 execute alpha-community ${wranglerArgs} --file=${tmpFile}`.quiet();
    console.log(`run_id: ${runId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
