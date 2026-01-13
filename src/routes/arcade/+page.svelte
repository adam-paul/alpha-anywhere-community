<script lang="ts">
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { computeProgressPercent } from '$lib/types';
  import GameGrid from '$lib/components/GameGrid.svelte';
  import WorkWall from '$lib/components/WorkWall.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import DevTools from '$lib/components/DevTools.svelte';

  // Create arcade store (provides context to child components)
  const arcade = createArcadeStore();

  // Track if user has dismissed the work wall after completing goals
  let workWallDismissed = $state(false);

  // Track previous lock state to detect toggles
  let prevIsUnlocked = $state(arcade.gatingState.isUnlocked);

  // Calculate if goals are complete
  const progressPercent = $derived(computeProgressPercent(arcade.gatingState));
  const isGoalComplete = $derived(progressPercent >= 100);

  // Reset dismissed state if XP drops below 100%
  $effect(() => {
    if (!isGoalComplete) {
      workWallDismissed = false;
    }
  });

  // Reset dismissed state if lock state changes from unlocked → locked
  $effect(() => {
    const currentIsUnlocked = arcade.gatingState.isUnlocked;
    if (prevIsUnlocked && !currentIsUnlocked) {
      workWallDismissed = false;
    }
    prevIsUnlocked = currentIsUnlocked;
  });

  // Show work wall when: locked AND NOT (complete + dismissed)
  const showWorkWall = $derived(
    !arcade.gatingState.isUnlocked && !(isGoalComplete && workWallDismissed)
  );

  function handleWorkWallDismiss() {
    workWallDismissed = true;
  }

  // Dev tools bindings
  let devIsLocked = $state(false);
  let devXpCurrent = $state(67);

  // Sync dev tools to arcade store
  $effect(() => {
    arcade.gatingState = {
      mode: 'daily',
      isUnlocked: !devIsLocked,
      xpCurrent: devIsLocked ? devXpCurrent : 120,
      xpRequired: 120
    };
  });
</script>

<svelte:head>
  <title>Arcade - Alpha Anywhere Community</title>
</svelte:head>

<div class="arcade-container">
  <div class="arcade-widget">
    <div class="arcade-header">
      <h2 class="arcade-title">Arcade</h2>
      <FilterBar disabled={showWorkWall} />
    </div>

    <div class="arcade-body" class:locked={showWorkWall}>
      <GameGrid disabled={showWorkWall} />

      {#if showWorkWall}
        <WorkWall gatingState={arcade.gatingState} on:dismiss={handleWorkWallDismiss} />
      {/if}
    </div>
  </div>
</div>

<DevTools
  bind:isLocked={devIsLocked}
  bind:xpCurrent={devXpCurrent}
  bind:theme={arcade.theme}
  xpRequired={120}
/>

<style>
  .arcade-container {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

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
    min-height: 500px;
  }

  .arcade-body.locked {
    overflow: hidden;
  }
</style>
