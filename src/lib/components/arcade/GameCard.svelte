<script lang="ts">
  import type { Game } from '$lib/types';
  import { Card, Icon, IconButton } from '$lib/components/ui';
  import CategoryBadge from './CategoryBadge.svelte';
  import PlayerCount from './PlayerCount.svelte';

  interface Props {
    game: Game;
    disabled?: boolean;
    onEnter?: (game: Game) => void;
    onEdit?: (game: Game) => void;
    /** Lobby-membership count from presence. Undefined = hide the footer. */
    playerCount?: number;
  }

  let { game, disabled = false, onEnter, onEdit, playerCount }: Props = $props();

  function handleClick() {
    if (disabled) return;
    onEnter?.(game);
  }
</script>

<Card interactive {disabled} onclick={handleClick}>
  <div class="thumbnail-container" class:inactive={game.isActive === false}>
    <img src={game.thumbnailUrl} alt={game.title} class="thumbnail" loading="lazy" />
    <div class="thumbnail-overlay">
      <span class="play-label">Play</span>
    </div>
    {#if game.isActive === false}
      <div class="inactive-badge">
        <Icon name="lock" size={12} />
        Inactive
      </div>
    {/if}
    {#if onEdit}
      <div class="edit-overlay">
        <IconButton
          icon="edit"
          shape="circle"
          size="sm"
          label="Edit game"
          onclick={(e) => {
            e.stopPropagation();
            onEdit(game);
          }}
        />
      </div>
    {/if}
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

  .thumbnail-container.inactive {
    opacity: 0.5;
  }

  .inactive-badge {
    position: absolute;
    bottom: var(--space-2);
    left: var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: white;
    background: var(--color-text);
    z-index: 2;
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
    background: var(--color-overlay);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  :global(.card:hover) .thumbnail-overlay,
  :global(.card:focus-visible) .thumbnail-overlay {
    opacity: 1;
  }

  .edit-overlay {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    opacity: 0;
    transition: opacity var(--transition-fast);
    z-index: 2;
  }

  .edit-overlay :global(.icon-btn) {
    background: var(--color-surface);
    color: var(--color-text);
  }

  :global(.card:hover) .edit-overlay {
    opacity: 1;
  }

  .play-label {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 800;
    color: var(--color-on-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: var(--space-2) var(--space-4);
    border: var(--border-width) solid var(--color-on-primary);
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
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    margin-top: auto;
    padding-top: var(--space-2);
  }
</style>
