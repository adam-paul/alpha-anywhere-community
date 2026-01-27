<script lang="ts">
  import { getArcadeStore } from '../stores/arcade.svelte';
  import type { GameLaunchData, GameType } from '../types';
  import { launchGame } from '../utils/game-launcher';
  import GameCard from './GameCard.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const arcade = getArcadeStore();

  const games = $derived(arcade.filteredGames);

  async function handleLaunch(data: GameLaunchData) {
    const result = await launchGame({
      launchUrl: data.launchUrl,
      type: data.gameType as GameType,
      gameId: data.gameId
    });

    if (!result.success) {
      console.error('Failed to launch game:', result.error);
    } else {
      console.log(`Launched via ${result.method}:`, data.gameId);
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
