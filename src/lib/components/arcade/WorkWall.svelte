<script lang="ts">
  import type { GatingState } from '$lib/types';
  import { GATING_UNIT_LABELS } from '$lib/constants';
  import { computeProgressPercent } from '$lib/utils/gating';
  import { Button, Icon } from '$lib/components/ui';
  import ProgressRing from './ProgressRing.svelte';

  interface Props {
    gatingState: GatingState | null;
    loading?: boolean;
    onDismiss?: () => void;
  }

  let { gatingState, loading = false, onDismiss }: Props = $props();

  const progressPercent = $derived(gatingState ? computeProgressPercent(gatingState) : 0);
  const isComplete = $derived(progressPercent >= 100);
  const modeLabel = $derived(gatingState?.mode === 'daily' ? 'today' : 'this week');
  const unitLabel = $derived(GATING_UNIT_LABELS[gatingState?.source ?? 'lwai']);

  function handleDismiss() {
    onDismiss?.();
  }
</script>

<div class="work-wall">
  <div class="work-wall-content" class:complete={isComplete && !loading}>
    {#if loading}
      <!-- Loading state -->
      <div class="loading-icon">
        <Icon name="clock" size={48} />
      </div>

      <h3 class="work-wall-title">Checking Progress...</h3>
      <p class="work-wall-message">Loading your learning data</p>

      <div class="progress-container">
        <ProgressRing progress={0} size={120} strokeWidth={10} />
        <div class="progress-label">
          <span class="progress-current">—</span>
          <span class="progress-separator">/</span>
          <span class="progress-required">— {unitLabel}</span>
        </div>
      </div>
    {:else if isComplete}
      <!-- Completed state -->
      <div class="unlock-icon">
        <Icon name="unlock" size={48} />
      </div>

      <h3 class="work-wall-title">Goal Complete!</h3>
      <p class="work-wall-message">
        Great work {modeLabel}! You've earned your play time.
      </p>

      <div class="progress-container">
        <ProgressRing progress={progressPercent} size={120} strokeWidth={10} />
        <div class="progress-label">
          <span class="progress-current complete">{gatingState.progressCurrent}</span>
          <span class="progress-separator">/</span>
          <span class="progress-required">{gatingState.progressRequired} {unitLabel}</span>
        </div>
      </div>

      <p class="congrats-text">You crushed it! Time to play.</p>

      <div class="unlock-btn">
        <Button variant="primary" size="lg" onclick={handleDismiss}>Enter Arcade</Button>
      </div>
    {:else}
      <!-- In-progress state -->
      <div class="lock-icon">
        <Icon name="lock" size={48} />
      </div>

      <h3 class="work-wall-title">Complete Your Goals</h3>
      <p class="work-wall-message">
        Finish your learning goals {modeLabel} to unlock the Arcade!
      </p>

      <div class="progress-container">
        <ProgressRing progress={progressPercent} size={120} strokeWidth={10} />
        <div class="progress-label">
          <span class="progress-current">{gatingState.progressCurrent}</span>
          <span class="progress-separator">/</span>
          <span class="progress-required">{gatingState.progressRequired} {unitLabel}</span>
        </div>
      </div>

      <p class="motivation-text">
        {#if progressPercent < 25}
          You've got this! Start strong.
        {:else if progressPercent < 50}
          Great start! Keep the momentum going.
        {:else if progressPercent < 75}
          Halfway there! You're doing amazing.
        {:else}
          Almost there! Just a little more.
        {/if}
      </p>
    {/if}
  </div>
</div>

<style>
  .work-wall {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-locked-overlay);
    backdrop-filter: blur(4px);
    z-index: 10;
  }

  .work-wall-content {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    padding: var(--space-8);
    text-align: center;
    max-width: 360px;
    width: 90%;
  }

  .work-wall-content.complete {
    border-color: var(--color-progress-fill);
  }

  .lock-icon,
  .unlock-icon,
  .loading-icon {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .unlock-icon {
    color: var(--color-progress-fill);
  }

  .loading-icon {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  .work-wall-title {
    font-size: var(--font-size-xl);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .work-wall-content.complete .work-wall-title {
    color: var(--color-progress-fill);
  }

  .work-wall-message {
    color: var(--color-text-muted);
    margin-bottom: var(--space-6);
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .progress-label {
    font-family: var(--font-display);
    font-weight: 700;
  }

  .progress-current {
    font-size: var(--font-size-2xl);
    color: var(--color-progress-incomplete);
  }

  .progress-current.complete {
    color: var(--color-progress-fill);
  }

  .progress-separator {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
    margin: 0 var(--space-1);
  }

  .progress-required {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  .motivation-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .congrats-text {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-progress-fill);
    margin-bottom: var(--space-6);
  }

  .unlock-btn {
    width: 100%;
  }

  .unlock-btn :global(.btn) {
    width: 100%;
  }
</style>
