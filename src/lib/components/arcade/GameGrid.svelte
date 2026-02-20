<script lang="ts">
  import { getArcadeStore } from '$lib/stores/arcade.svelte';
  import type { Game, LaunchOptions } from '$lib/types';
  import { launchGame } from '$lib/utils/game-launcher';
  import Placeholder from '$lib/components/Placeholder.svelte';
  import GameCard from './GameCard.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const arcade = getArcadeStore();

  const games = $derived(arcade.filteredGames);

  function handleLaunch(game: Game) {
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
    } else {
      console.log(`Launched via ${result.method}:`, game.id);
    }
  }
</script>

<div class="game-grid">
  {#each games as game (game.id)}
    <GameCard {game} {disabled} onLaunch={handleLaunch} />
  {/each}

  {#if games.length === 0}
    <Placeholder size="sm" title="No games found in this category." />
  {/if}
</div>

<style>
  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }

  .game-grid :global(.placeholder) {
    grid-column: 1 / -1;
  }
</style>
