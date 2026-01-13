<script lang="ts">
  import { getArcadeStore } from '../stores/arcade.svelte';
  import GameCard from './GameCard.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const arcade = getArcadeStore();

  const games = $derived(arcade.filteredGames);

  function handleLaunch(event: CustomEvent<{ gameId: string; gameType: string; launchUrl: string }>) {
    // For now, just log the launch. In the future, this would open the game.
    console.log('Launching game:', event.detail);
    // Could also: window.open(event.detail.launchUrl, '_blank');
  }
</script>

<div class="game-grid">
  {#each games as game (game.id)}
    <GameCard
      {game}
      {disabled}
      on:launch={handleLaunch}
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
