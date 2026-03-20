<script lang="ts">
  import Avatar from './Avatar.svelte';

  interface Props {
    participants: Array<{ avatarUrl?: string; displayName: string }>;
    size?: 'sm' | 'md';
  }

  let { participants, size = 'sm' }: Props = $props();
</script>

<div class="avatar-stack size-{size}">
  {#each participants.slice(0, 2) as participant}
    <Avatar
      src={participant.avatarUrl}
      alt={participant.displayName}
      {size}
      fallback={participant.displayName.charAt(0)}
    />
  {/each}
</div>

<style>
  .avatar-stack {
    position: relative;
  }

  .size-sm {
    width: var(--avatar-size-md);
    height: var(--avatar-size-md);
  }

  .size-md {
    width: var(--avatar-size-lg);
    height: var(--avatar-size-lg);
  }

  .avatar-stack :global(.avatar:first-child) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .avatar-stack :global(.avatar:last-child) {
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 0;
  }
</style>
