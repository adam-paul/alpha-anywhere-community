/**
 * Harness subpath — exported separately from the main barrel so that the
 * Node-only pieces (fs, crypto) never reach the SvelteKit/Workers bundle.
 * Only CLI consumers import from here.
 */

export {
  loadCorpus,
  validateCorpus,
  corpusHash,
  type CorpusCase,
  type CorpusDifficulty
} from './corpus';

export { runEval, type RunReport, type SingleCaseResult, type RunEvalOptions } from './runEval';
