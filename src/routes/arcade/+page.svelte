<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { createArcadeStore } from '$lib/stores/arcade.svelte';
  import { createGatingStore } from '$lib/stores/gating.svelte';
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import { GATING_UNIT_LABELS } from '$lib/constants';
  import type {
    Game,
    GameFormData,
    GameFormMode,
    GatingState,
    LaunchOptions,
    PresenceApiResponse
  } from '$lib/types';
  import { launchGame } from '$lib/utils/game-launcher';
  import { IconButton, PageHeader } from '$lib/components/ui';
  import GameGrid from '$lib/components/arcade/GameGrid.svelte';
  import WorkWall from '$lib/components/arcade/WorkWall.svelte';
  import FilterBar from '$lib/components/arcade/FilterBar.svelte';
  import DevTools from '$lib/components/admin/DevTools.svelte';
  import GameFormModal from '$lib/components/admin/GameFormModal.svelte';
  import RobloxLinkModal from '$lib/components/arcade/RobloxLinkModal.svelte';

  let { data } = $props();

  // Create stores
  // svelte-ignore state_referenced_locally
  const arcade = createArcadeStore({ games: data.games, robloxLinked: data.robloxLinked });
  const voice = getVoiceStore();
  // svelte-ignore state_referenced_locally
  const gating = createGatingStore(data.gatingState);

  // Sync games into store when server data refreshes (e.g., after admin CRUD)
  $effect(() => {
    arcade.setGames(data.games);
  });

  // Launch handling (lifted from GameGrid so the Roblox-link flow can
  // resume the original launch after linking completes)
  let pendingLaunch = $state<Game | null>(null);

  function handleLaunch(game: Game) {
    if (game.type === 'roblox') {
      if (!arcade.robloxLinked) {
        pendingLaunch = game;
        robloxLinkOpen = true;
        return;
      }

      // Record launch in KV (fire and forget — don't block the deep link)
      fetch('/api/arcade/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id })
      }).catch(() => {
        // Non-critical — presence just won't track this session
      });
    }

    let options: LaunchOptions;

    switch (game.type) {
      case 'roblox':
        if (!game.placeId || !game.accessCode || !game.linkCode) {
          console.error('Roblox games require placeId, accessCode, and linkCode');
          return;
        }
        options = {
          type: 'roblox',
          gameId: game.id,
          placeId: game.placeId,
          accessCode: game.accessCode,
          linkCode: game.linkCode
        };
        break;

      case 'web':
      case 'minecraft':
        if (!game.launchUrl) {
          console.error(`${game.type} games require launchUrl`);
          return;
        }
        options = {
          type: game.type,
          gameId: game.id,
          launchUrl: game.launchUrl
        };
        break;

      case 'iframe':
        options = {
          type: 'iframe',
          gameId: game.id,
          launchUrl: game.launchUrl
        };
        break;
    }

    const result = launchGame(options);

    if (!result.success) {
      console.error('Failed to launch game:', result.error);
    }
    // Voice room entry is deferred to the presence poll below, which waits
    // for Roblox to confirm the student is actually in-game. Joining here
    // would risk an immediate disconnect before the game finishes loading.
  }

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

  // Presence polling — fetch counts every 15s while arcade is visible.
  // Also the single source of truth for per-game voice lobbies: voice
  // only joins once Roblox confirms the student is in-game, and leaves
  // as soon as presence drops.
  $effect(() => {
    if (gating.showWorkWall) return;

    let active = true;

    async function poll() {
      try {
        const res = await fetch('/api/arcade/presence');
        if (res.ok && active) {
          const { counts, currentUserGameId } = (await res.json()) as PresenceApiResponse;
          arcade.setPresenceCounts(counts);

          if (currentUserGameId) {
            const wantedRoom = `game:${currentUserGameId}`;
            if (voice.roomName !== wantedRoom) voice.joinRoom(wantedRoom);
          } else if (voice.roomName?.startsWith('game:')) {
            voice.leaveRoom();
          }
        }
      } catch {
        // Silently ignore polling failures
      }
    }

    poll();
    const interval = setInterval(poll, 15_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  });

  // Roblox linking modal
  let robloxLinkOpen = $state(false);

  function handleRobloxLinked() {
    robloxLinkOpen = false;
    arcade.setRobloxLinked(true);

    // Resume the launch that triggered the link flow, if any
    const resume = pendingLaunch;
    pendingLaunch = null;
    if (resume) handleLaunch(resume);
  }

  function handleRobloxLinkClose() {
    robloxLinkOpen = false;
    pendingLaunch = null;
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
  <GameGrid
    disabled={gating.showWorkWall}
    onLaunch={handleLaunch}
    onEdit={data.isAdmin ? openEditGame : undefined}
  />

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

<RobloxLinkModal
  open={robloxLinkOpen}
  onclose={handleRobloxLinkClose}
  onlinked={handleRobloxLinked}
/>

<style>
  .arcade-content {
    position: relative;
    min-height: calc(100vh - 200px); /* Fill viewport minus header/padding */
  }

  .arcade-content.locked {
    overflow: hidden;
  }
</style>
