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
      }).catch(() => {});

      // Optimistic count bump — gives immediate visual feedback on the
      // game card while waiting for the server poll to confirm.
      arcade.setPresenceCounts({
        ...arcade.presenceCounts,
        [game.id]: (arcade.presenceCounts[game.id] ?? 0) + 1
      });

      // Check presence 5s after click — gives Roblox time to register the
      // session, then triggers voice auto-join without waiting for the full
      // poll cycle.
      setTimeout(poll, 5000);
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

  // Presence polling — fetch counts + drive per-game voice lobbies.
  // Hoisted so handleLaunch can trigger an immediate check after a click.
  let pollActive = false;

  async function poll() {
    if (!pollActive) return;
    try {
      const res = await fetch('/api/arcade/presence');
      if (res.ok && pollActive) {
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

  $effect(() => {
    if (gating.showWorkWall) return;

    pollActive = true;
    poll();
    const interval = setInterval(poll, 10_000);

    return () => {
      pollActive = false;
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
