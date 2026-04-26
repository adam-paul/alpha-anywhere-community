<script lang="ts">
  import type { Game, LaunchOptions } from '$lib/types';
  import { Button, Icon } from '$lib/components/ui';
  import { launchGame } from '$lib/utils/game-launcher';
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import RobloxLinkModal from './RobloxLinkModal.svelte';

  interface Props {
    game: Game;
    robloxLinked: boolean;
    inGameCount: number;
    inGameLoading?: boolean;
    /** Called after launch is initiated so the parent can bump count optimistically. */
    onlaunch?: () => void;
    /** Called after Roblox linking completes so the parent can flip its flag. */
    onlinked?: () => void;
  }

  let {
    game,
    robloxLinked,
    inGameCount,
    inGameLoading = false,
    onlaunch,
    onlinked
  }: Props = $props();

  const voice = getVoiceStore();

  let linkModalOpen = $state(false);
  let launchError = $state<string | null>(null);

  const inGameLabel = $derived(inGameCount === 1 ? 'student in-game' : 'students in-game');
  const showInGameCount = $derived(game.type === 'roblox');

  async function doLaunch() {
    launchError = null;

    // Roblox-only: mark KV record before deep link so the game-presence endpoint
    // can reconcile Roblox's Presence API to this user inside the 5-minute TTL.
    if (game.type === 'roblox') {
      try {
        await fetch('/api/arcade/game-presence/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.id })
        });
      } catch {
        // Non-fatal — the deep link will still work; in-game count won't update
        // until polling catches up via Roblox's API.
      }
    }

    let options: LaunchOptions;
    switch (game.type) {
      case 'roblox':
        if (!game.placeId || !game.accessCode || !game.linkCode) {
          launchError = 'Game credentials missing. Contact an admin.';
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
          launchError = `${game.type} games need a launch URL.`;
          return;
        }
        options = { type: game.type, gameId: game.id, launchUrl: game.launchUrl };
        break;
      case 'iframe':
        options = { type: 'iframe', gameId: game.id, launchUrl: game.launchUrl };
        break;
    }

    // Roblox deep links fire pagehide while the tab stays alive — arm a short
    // suppression window so the voice store's auto-disconnect doesn't drop
    // the lobby voice room on the OS hand-off. 2s is plenty for the protocol
    // dispatch without leaving us exposed to real close events for long.
    if (options.type === 'roblox') voice.suppressAutoDisconnect(2000);

    const result = launchGame(options);
    if (!result.success) {
      launchError = result.error ?? 'Failed to launch.';
      return;
    }

    onlaunch?.();
  }

  function handleEnterClick() {
    if (game.type === 'roblox' && !robloxLinked) {
      linkModalOpen = true;
      return;
    }
    doLaunch();
  }

  function handleLinked() {
    linkModalOpen = false;
    onlinked?.();
    // Resume the launch that triggered the link flow.
    doLaunch();
  }
</script>

<aside class="game-panel">
  <div class="panel-section">
    <h2 class="section-title">Ready to play?</h2>
    <Button variant="primary" size="lg" onclick={handleEnterClick}>Enter Game</Button>
    {#if launchError}
      <p class="error">{launchError}</p>
    {/if}
  </div>

  {#if showInGameCount}
    <div class="panel-section presence">
      <div class="presence-indicator" class:loading={inGameLoading}></div>
      <span class="presence-text">
        {inGameCount}
        {inGameLabel}
      </span>
    </div>
  {/if}

  {#if game.description}
    <div class="panel-section">
      <h3 class="section-title">About</h3>
      <p class="description">{game.description}</p>
    </div>
  {/if}

  {#if game.type === 'roblox' && !robloxLinked}
    <div class="panel-section hint">
      <Icon name="info" size={16} />
      <span>You'll be asked to link a Roblox account before launching.</span>
    </div>
  {/if}
</aside>

<RobloxLinkModal
  open={linkModalOpen}
  onclose={() => (linkModalOpen = false)}
  onlinked={handleLinked}
/>

<style>
  .game-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6);
    background: var(--color-surface);
    border-left: var(--border-width) solid var(--color-border);
    height: 100%;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .panel-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .panel-section :global(.btn) {
    width: 100%;
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0;
  }

  .error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    margin: 0;
  }

  .description {
    font-size: var(--font-size-sm);
    line-height: 1.5;
    margin: 0;
  }

  .presence {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  .presence-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-side-by-side);
    animation: var(--animation-pulse);
  }

  .presence-indicator.loading {
    background: var(--color-text-muted);
  }

  .presence-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .hint {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.4;
  }
</style>
