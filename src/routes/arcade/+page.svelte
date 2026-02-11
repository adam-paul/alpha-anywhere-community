<script lang="ts">
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { createGatingStore } from '$lib/stores/gating.svelte';
  import type { GatingState } from '$lib/types';
  import { PageHeader } from '$lib/components/layout';
  import GameGrid from '$lib/components/GameGrid.svelte';
  import WorkWall from '$lib/components/WorkWall.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import DevTools from '$lib/components/DevTools.svelte';

  let { data } = $props();

  // Create stores (initial values only, not reactive to data changes)
  // svelte-ignore state_referenced_locally
  const arcade = createArcadeStore({ games: data.games });
  // svelte-ignore state_referenced_locally
  const gating = createGatingStore(data.gatingState);

  // Dev tools bindings
  let devIsLocked = $state(false);
  let devMinutesCurrent = $state(0);
  let devToolsReady = $state(false);

  // Initialize dev tools when server data loads
  $effect(() => {
    if (gating.serverData && !devToolsReady) {
      devIsLocked = !gating.serverData.isUnlocked;
      devMinutesCurrent = gating.serverData.minutesCurrent;
      devToolsReady = true;
    }
  });

  // Sync dev tools to gating store
  function syncDevTools() {
    if (!gating.serverData) return;

    const override: GatingState = {
      mode: gating.serverData.mode,
      isUnlocked: !devIsLocked,
      minutesCurrent: devIsLocked ? devMinutesCurrent : gating.serverData.minutesRequired,
      minutesRequired: gating.serverData.minutesRequired
    };

    gating.setDevOverride(override);
  }
</script>

<svelte:head>
  <title>Arcade - Alpha Anywhere Community</title>
</svelte:head>

<PageHeader title="Arcade">
  {#snippet actions()}
    <FilterBar disabled={gating.showWorkWall} />
  {/snippet}
</PageHeader>

<div class="arcade-content" class:locked={gating.showWorkWall}>
  <GameGrid disabled={gating.showWorkWall} />

  {#if gating.showWorkWall}
    <WorkWall
      gatingState={gating.activeData}
      loading={gating.isLoading}
      onDismiss={gating.dismiss}
    />
  {/if}
</div>

{#if gating.serverData}
  <DevTools
    bind:isLocked={devIsLocked}
    bind:minutesCurrent={devMinutesCurrent}
    bind:theme={arcade.theme}
    minutesRequired={gating.serverData.minutesRequired}
    onchange={syncDevTools}
  />
{/if}

<style>
  .arcade-content {
    position: relative;
    min-height: calc(100vh - 200px); /* Fill viewport minus header/padding */
  }

  .arcade-content.locked {
    overflow: hidden;
  }
</style>
