<script lang="ts">
  import type { Game, PresenceUser } from '$lib/types';
  import { Avatar, AvatarStack, IconButton } from '$lib/components/ui';

  interface Props {
    game: Game;
    /** Other users in the lobby (the current user is counted separately). */
    otherParticipants: PresenceUser[];
    onback?: () => void;
  }

  let { game, otherParticipants, onback }: Props = $props();

  // Include the current viewer in the label — presence store doesn't track self.
  const presenceCount = $derived(otherParticipants.length + 1);
  const presenceLabel = $derived(presenceCount === 1 ? 'student here' : 'students here');

  // Show up to 3 avatars in the stack; overflow indicated by the count label.
  const shown = $derived(
    otherParticipants.slice(0, 3).map((p) => ({ displayName: p.displayName, avatarUrl: undefined }))
  );
</script>

<header class="lobby-header">
  <div class="header-left">
    {#if onback}
      <IconButton icon="chevron-left" shape="circle" label="Back to arcade" onclick={onback} />
    {/if}
    <img src={game.thumbnailUrl} alt={game.title} class="thumbnail" />
    <div class="title-block">
      <h1 class="title">{game.title}</h1>
      <span class="subtitle">{presenceCount} {presenceLabel}</span>
    </div>
  </div>

  <div class="header-right">
    {#if shown.length >= 2}
      <AvatarStack participants={shown} />
    {:else if shown.length === 1}
      <Avatar alt={shown[0].displayName} size="md" fallback={shown[0].displayName.charAt(0)} />
    {/if}
  </div>
</header>

<style>
  .lobby-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
    border-bottom: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .thumbnail {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .title-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .title {
    font-size: var(--font-size-base);
    font-weight: 700;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }
</style>
