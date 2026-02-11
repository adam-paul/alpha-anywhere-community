/**
 * Gating utility functions.
 */

import type { GatingState } from '$lib/types';

/**
 * Compute progress percentage for a gating state.
 */
export function computeProgressPercent(state: GatingState): number {
  if (state.minutesRequired <= 0) return 100;
  return Math.min(100, Math.round((state.minutesCurrent / state.minutesRequired) * 100));
}
