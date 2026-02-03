<script lang="ts">
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { computeProgressPercent } from '$lib/types';
  import { PageHeader } from '$lib/components/layout';
  import GameGrid from '$lib/components/GameGrid.svelte';
  import WorkWall from '$lib/components/WorkWall.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import DevTools from '$lib/components/DevTools.svelte';

  let { data } = $props();

  // Create arcade store with games from server
  const arcade = createArcadeStore({ games: data.games });

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

<PageHeader title="Arcade">
  {#snippet actions()}
    <FilterBar disabled={showWorkWall} />
  {/snippet}
</PageHeader>

<div class="arcade-content" class:locked={showWorkWall}>
  <GameGrid disabled={showWorkWall} />

  {#if showWorkWall}
    <WorkWall gatingState={arcade.gatingState} onDismiss={handleWorkWallDismiss} />
  {/if}
</div>

<DevTools
  bind:isLocked={devIsLocked}
  bind:xpCurrent={devXpCurrent}
  bind:theme={arcade.theme}
  xpRequired={120}
/>

<style>
  .arcade-content {
    position: relative;
    min-height: 400px;
  }

  .arcade-content.locked {
    overflow: hidden;
  }
</style>
