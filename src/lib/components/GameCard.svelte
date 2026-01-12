<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Game } from '../types';
  import CategoryBadge from './CategoryBadge.svelte';
  import PlayerCount from './PlayerCount.svelte';

  interface Props {
    game: Game;
    disabled?: boolean;
  }

  let { game, disabled = false }: Props = $props();

  const dispatch = createEventDispatcher<{
    launch: { gameId: string; gameType: string; launchUrl: string }
  }>();

  function handleClick() {
    if (disabled) return;
    dispatch('launch', {
      gameId: game.id,
      gameType: game.type,
      launchUrl: game.launchUrl
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<div
  class="game-card card"
  class:disabled
  role="button"
  tabindex={disabled ? -1 : 0}
  onclick={handleClick}
  onkeydown={handleKeydown}
  aria-disabled={disabled}
>
  <div class="thumbnail-container">
    <img
      src={game.thumbnailUrl}
      alt={game.title}
      class="thumbnail"
      loading="lazy"
    />
    <div class="thumbnail-overlay">
      <span class="play-label">Play</span>
    </div>
  </div>

  <div class="card-content">
    <div class="card-header">
      <h3 class="game-title">{game.title}</h3>
      <CategoryBadge category={game.engagementCategory} />
    </div>

    {#if game.description}
      <p class="game-description">{game.description}</p>
    {/if}

    <div class="card-footer">
      <PlayerCount count={game.currentPlayers} />
    </div>
  </div>
</div>

<style>
  .game-card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    outline: none;
    user-select: none;
  }

  .game-card:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
  }

  .game-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .thumbnail-container {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-base);
  }

  .game-card:hover .thumbnail {
    transform: scale(1.05);
  }

  .thumbnail-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .game-card:hover .thumbnail-overlay,
  .game-card:focus-visible .thumbnail-overlay {
    opacity: 1;
  }

  .play-label {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 800;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: var(--space-2) var(--space-4);
    border: 3px solid white;
  }

  .card-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .game-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    margin: 0;
    line-height: 1.3;
  }

  .game-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    margin-top: auto;
    padding-top: var(--space-2);
  }
</style>
