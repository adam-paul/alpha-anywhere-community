<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { createGatingStore } from '$lib/stores/gating.svelte';
  import { GATING_UNIT_LABELS } from '$lib/constants';
  import type { Game, GameFormData, GameFormMode, GatingState } from '$lib/types';
  import { IconButton, PageHeader } from '$lib/components/ui';
  import GameGrid from '$lib/components/arcade/GameGrid.svelte';
  import WorkWall from '$lib/components/arcade/WorkWall.svelte';
  import FilterBar from '$lib/components/arcade/FilterBar.svelte';
  import DevTools from '$lib/components/admin/DevTools.svelte';
  import GameFormModal from '$lib/components/admin/GameFormModal.svelte';

  let { data } = $props();

  // Create stores
  // svelte-ignore state_referenced_locally
  const arcade = createArcadeStore({ games: data.games });
  // svelte-ignore state_referenced_locally
  const gating = createGatingStore(data.gatingState);

  // Sync games into store when server data refreshes (e.g., after admin CRUD)
  $effect(() => {
    arcade.setGames(data.games);
  });

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

  // Admin: game form modal state
  let gameFormOpen = $state(false);
  let gameFormMode = $state<GameFormMode>({ kind: 'create' });
  let gameFormInitialData = $state<GameFormData | undefined>(undefined);
  let gameFormHasCredentials = $state(false);

  function openCreateGame() {
    gameFormMode = { kind: 'create' };
    gameFormInitialData = undefined;
    gameFormHasCredentials = false;
    gameFormOpen = true;
  }

  function openEditGame(game: Game) {
    gameFormMode = { kind: 'edit', gameId: game.id };
    gameFormInitialData = {
      title: game.title,
      type: game.type,
      engagementCategory: game.engagementCategory,
      description: game.description ?? '',
      thumbnailUrl: game.thumbnailUrl,
      launchUrl: game.launchUrl ?? '',
      placeId: game.placeId ?? '',
      accessCode: '',
      linkCode: '',
      isActive: game.isActive ?? true
    };
    gameFormHasCredentials = !!(game.accessCode && game.linkCode);
    gameFormOpen = true;
  }

  async function handleGameSave() {
    gameFormOpen = false;
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>Arcade - Alpha Anywhere Community</title>
</svelte:head>

<PageHeader title="Arcade">
  {#snippet actions()}
    <FilterBar disabled={gating.showWorkWall} />
    {#if data.isAdmin}
      <IconButton icon="plus" shape="circle" label="Add game" onclick={openCreateGame} />
    {/if}
  {/snippet}
</PageHeader>

<div class="arcade-content" class:locked={gating.showWorkWall}>
  <GameGrid disabled={gating.showWorkWall} onEdit={data.isAdmin ? openEditGame : undefined} />

  {#if gating.showWorkWall}
    <WorkWall {gating} />
  {/if}
</div>

{#if data.isAdmin && gating.serverData}
  <DevTools
    bind:isLocked={devIsLocked}
    bind:progressCurrent={devProgressCurrent}
    bind:theme={arcade.theme}
    progressRequired={gating.serverData.progressRequired}
    {unitLabel}
    onchange={syncDevTools}
  />
{/if}

{#if data.isAdmin}
  <GameFormModal
    open={gameFormOpen}
    onclose={() => (gameFormOpen = false)}
    mode={gameFormMode}
    initialData={gameFormInitialData}
    hasCredentials={gameFormHasCredentials}
    onsave={handleGameSave}
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
