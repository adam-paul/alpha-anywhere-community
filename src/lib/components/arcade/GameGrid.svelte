<script lang="ts">
  import { getArcadeStore } from '$lib/stores/arcade.svelte';
  import type { Game } from '$lib/types';
  import { Placeholder } from '$lib/components/ui';
  import GameCard from './GameCard.svelte';

  interface Props {
    disabled?: boolean;
    onEnter: (game: Game) => void;
    onEdit?: (game: Game) => void;
    /** Lobby-membership counts derived from presence:global; keyed by game id. */
    lobbyCounts: Record<string, number>;
  }

  let { disabled = false, onEnter, onEdit, lobbyCounts }: Props = $props();

  const arcade = getArcadeStore();

  const games = $derived(arcade.filteredGames);
</script>

<div class="game-grid">
  {#each games as game (game.id)}
    <GameCard
      {game}
      {disabled}
      {onEnter}
      {onEdit}
      playerCount={lobbyCounts[game.id] || undefined}
    />
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
