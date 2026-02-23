<script lang="ts">
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { createGatingStore } from '$lib/stores/gating.svelte';
  import { GATING_UNIT_LABELS } from '$lib/constants';
  import type { GatingState } from '$lib/types';
  import { PageHeader } from '$lib/components/ui';
  import GameGrid from '$lib/components/arcade/GameGrid.svelte';
  import WorkWall from '$lib/components/arcade/WorkWall.svelte';
  import FilterBar from '$lib/components/arcade/FilterBar.svelte';
  import DevTools from '$lib/components/arcade/DevTools.svelte';

  let { data } = $props();

  // Create stores (initial values only, not reactive to data changes)
  // svelte-ignore state_referenced_locally
  const arcade = createArcadeStore({ games: data.games });
  // svelte-ignore state_referenced_locally
  const gating = createGatingStore(data.gatingState);

  // Dev tools bindings
  let devIsLocked = $state(false);
  let devProgressCurrent = $state(0);
  let devToolsReady = $state(false);

  const unitLabel = $derived(GATING_UNIT_LABELS[gating.serverData?.source ?? 'lwai']);

  // Initialize dev tools when server data loads
  $effect(() => {
    if (gating.serverData && !devToolsReady) {
      devIsLocked = !gating.serverData.isUnlocked;
      devProgressCurrent = gating.serverData.progressCurrent;
      devToolsReady = true;
    }
  });

  // Sync dev tools to gating store
  function syncDevTools() {
    if (!gating.serverData) return;

    const override: GatingState = {
      mode: gating.serverData.mode,
      isUnlocked: !devIsLocked,
      progressCurrent: devIsLocked ? devProgressCurrent : gating.serverData.progressRequired,
      progressRequired: gating.serverData.progressRequired,
      source: gating.serverData.source
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
    bind:progressCurrent={devProgressCurrent}
    bind:theme={arcade.theme}
    progressRequired={gating.serverData.progressRequired}
    {unitLabel}
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
