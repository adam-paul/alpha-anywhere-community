<script lang="ts">
  import type { Student } from '$lib/types';
  import { Avatar } from './ui';

  interface Props {
    friends: Student[];
  }

  let { friends }: Props = $props();
</script>

{#if friends.length > 0}
  <div class="mutual-friends">
    <div class="avatar-stack">
      {#each friends.slice(0, 3) as friend (friend.id)}
        <a href="/profile/{friend.id}" class="avatar-link" title={friend.displayName}>
          <Avatar
            src={friend.avatarUrl}
            alt={friend.displayName}
            size="sm"
            fallback={friend.displayName.charAt(0)}
          />
        </a>
      {/each}
    </div>
    <span class="friends-label">
      {friends.length} mutual friend{friends.length !== 1 ? 's' : ''}
    </span>
  </div>
{/if}

<style>
  .mutual-friends {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .avatar-stack {
    display: flex;
  }

  .avatar-link {
    margin-left: -8px;
    border: 2px solid var(--color-surface);
    border-radius: 50%;
    transition: transform var(--transition-fast);
  }

  .avatar-link:first-child {
    margin-left: 0;
  }

  .avatar-link:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .friends-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
</style>
