<script lang="ts">
  import type { Game, GameLaunchData } from '../types';
  import { Card } from './ui';
  import CategoryBadge from './CategoryBadge.svelte';
  import PlayerCount from './PlayerCount.svelte';

  interface Props {
    game: Game;
    disabled?: boolean;
    onLaunch?: (data: GameLaunchData) => void;
    playerCount?: number;  // Will come from real-time presence later
  }

  let { game, disabled = false, onLaunch, playerCount }: Props = $props();

  function handleClick() {
    if (disabled) return;
    onLaunch?.({
      gameId: game.id,
      gameType: game.type,
      placeId: game.placeId,
      accessCode: game.accessCode,
      linkCode: game.linkCode,
      launchUrl: game.launchUrl
    });
  }
</script>

<Card interactive {disabled} onclick={handleClick}>
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

    {#if playerCount !== undefined}
      <div class="card-footer">
        <PlayerCount count={playerCount} />
      </div>
    {/if}
  </div>
</Card>

<style>
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

  :global(.card:hover) .thumbnail {
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

  :global(.card:hover) .thumbnail-overlay,
  :global(.card:focus-visible) .thumbnail-overlay {
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
