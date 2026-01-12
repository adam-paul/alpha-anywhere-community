<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WidgetConfig, WidgetEvent } from '../types';
  import { computeProgressPercent } from '../types';
  import { createWidgetContext } from '../stores/widget.svelte';
  import GameGrid from './GameGrid.svelte';
  import WorkWall from './WorkWall.svelte';
  import FilterBar from './FilterBar.svelte';

  interface Props {
    config: WidgetConfig;
  }

  let { config }: Props = $props();

  const dispatch = createEventDispatcher<{ event: WidgetEvent }>();

  // Create widget context with getter for reactivity
  const widgetState = createWidgetContext(() => config);

  // Track if user has dismissed the work wall after completing goals
  let workWallDismissed = $state(false);

  // Track previous lock state to detect toggles
  let prevIsUnlocked = $state(config.gatingState.isUnlocked);

  // Calculate if goals are complete
  const progressPercent = $derived(computeProgressPercent(config.gatingState));
  const isGoalComplete = $derived(progressPercent >= 100);

  // Reset dismissed state if:
  // 1. XP drops below 100%, OR
  // 2. Lock state changes from unlocked → locked (simulates new session)
  $effect(() => {
    if (!isGoalComplete) {
      workWallDismissed = false;
    }
  });

  $effect(() => {
    const currentIsUnlocked = config.gatingState.isUnlocked;
    // If transitioning from unlocked to locked, reset dismissed state
    if (prevIsUnlocked && !currentIsUnlocked) {
      workWallDismissed = false;
    }
    prevIsUnlocked = currentIsUnlocked;
  });

  // Determine if work wall should show
  const showWorkWall = $derived(
    !config.gatingState.isUnlocked && !(isGoalComplete && workWallDismissed)
  );

  // Emit ready event on mount
  $effect(() => {
    dispatch('event', { type: 'ready' });
  });

  function handleLaunch(event: CustomEvent<{ gameId: string; gameType: string; launchUrl: string }>) {
    dispatch('event', {
      type: 'launch',
      gameId: event.detail.gameId,
      gameType: event.detail.gameType as any,
      launchUrl: event.detail.launchUrl
    });
  }

  function handleWorkWallDismiss() {
    workWallDismissed = true;
  }
</script>

<div class="arcade-widget" data-theme={config.theme}>
  <div class="arcade-header">
    <h2 class="arcade-title">Arcade</h2>
    <FilterBar disabled={showWorkWall} />
  </div>

  <div class="arcade-body" class:locked={showWorkWall}>
    <GameGrid on:launch={handleLaunch} />

    {#if showWorkWall}
      <WorkWall gatingState={config.gatingState} on:dismiss={handleWorkWallDismiss} />
    {/if}
  </div>
</div>

<style>
  .arcade-widget {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .arcade-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    border-bottom: var(--border-width) solid var(--color-border);
    background: var(--color-bg);
  }

  .arcade-title {
    font-size: var(--font-size-xl);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .arcade-body {
    position: relative;
    padding: var(--space-6);
    min-height: 500px; /* Ensures work-wall always has room */
  }

  .arcade-body.locked {
    /* Grid is still visible but dimmed */
    overflow: hidden; /* Prevent scroll while locked */
  }
</style>
