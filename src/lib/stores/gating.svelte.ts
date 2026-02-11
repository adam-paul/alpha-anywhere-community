/**
 * Gating state management with clean discriminated union pattern.
 *
 * Encapsulates loading, error handling, dismissal, and dev overrides
 * in a single store with impossible states unrepresentable.
 */

import type { GatingLoadState, GatingState, GatingStore } from '$lib/types';
import { computeProgressPercent } from '$lib/utils/gating';

export function createGatingStore(gatingPromise: Promise<GatingState>): GatingStore {
  let state = $state<GatingLoadState>({ status: 'loading' });
  let devOverride = $state<GatingState | null>(null);

  // Track previous unlock state for detecting lock transitions
  let prevIsUnlocked = $state<boolean | null>(null);

  // Load data once
  gatingPromise
    .then((data) => {
      state = { status: 'ready', data, dismissed: false };
      prevIsUnlocked = data.isUnlocked;
    })
    .catch(() => {
      state = { status: 'error' };
    });

  // Derived values
  const isLoading = $derived(state.status === 'loading');
  const hasError = $derived(state.status === 'error');
  const serverData = $derived(state.status === 'ready' ? state.data : null);
  const activeData = $derived(devOverride ?? serverData);

  const progressPercent = $derived(activeData ? computeProgressPercent(activeData) : 0);
  const isGoalComplete = $derived(progressPercent >= 100);

  // Reset dismissed state if lock state changes from unlocked → locked
  $effect(() => {
    if (activeData && prevIsUnlocked !== null) {
      const currentIsUnlocked = activeData.isUnlocked;
      if (prevIsUnlocked && !currentIsUnlocked) {
        // Became locked - reset dismissed
        if (state.status === 'ready') {
          state = { ...state, dismissed: false };
        }
      }
      prevIsUnlocked = currentIsUnlocked;
    }
  });

  // Reset dismissed if progress drops below 100%
  $effect(() => {
    if (!isGoalComplete && state.status === 'ready' && state.dismissed) {
      state = { ...state, dismissed: false };
    }
  });

  const showWorkWall = $derived(
    state.status === 'loading' ||
      (state.status === 'ready' &&
        activeData !== null &&
        !activeData.isUnlocked &&
        !(isGoalComplete && state.dismissed))
  );

  return {
    get isLoading() {
      return isLoading;
    },
    get hasError() {
      return hasError;
    },
    get serverData() {
      return serverData;
    },
    get activeData() {
      return activeData;
    },
    get showWorkWall() {
      return showWorkWall;
    },
    get progressPercent() {
      return progressPercent;
    },
    get isGoalComplete() {
      return isGoalComplete;
    },

    dismiss() {
      if (state.status === 'ready') {
        state = { ...state, dismissed: true };
      }
    },

    setDevOverride(override: GatingState | null) {
      devOverride = override;
    }
  };
}
