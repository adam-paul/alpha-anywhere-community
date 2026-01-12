<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getWidgetContext } from '../stores/widget.svelte';
  import GameCard from './GameCard.svelte';

  const dispatch = createEventDispatcher<{
    launch: { gameId: string; gameType: string; launchUrl: string }
  }>();

  const widgetState = getWidgetContext();

  // Use getters for reactive access
  const games = $derived(widgetState.getFilteredGames());
  const config = $derived(widgetState.getConfig());

  function handleLaunch(event: CustomEvent<{ gameId: string; gameType: string; launchUrl: string }>) {
    dispatch('launch', event.detail);
  }
</script>

<div class="game-grid">
  {#each games as game (game.id)}
    <GameCard
      {game}
      disabled={!config.gatingState.isUnlocked}
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
