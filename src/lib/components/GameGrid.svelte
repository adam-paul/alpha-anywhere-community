<script lang="ts">
  import { getArcadeStore } from '../stores/arcade.svelte';
  import type { Game, LaunchOptions } from '../types';
  import { launchGame } from '../utils/game-launcher';
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
    <GameCard
      {game}
      {disabled}
      onLaunch={handleLaunch}
    />
  {/each}

  {#if games.length === 0}
    <div class="empty-state">
      <p>No games found in this category.</p>
    </div>
  {/if}
</div>

<style>
  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-12);
    color: var(--color-text-muted);
  }
</style>
