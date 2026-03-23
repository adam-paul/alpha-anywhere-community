<script lang="ts">
  import type { Conversation } from '$lib/types';
  import { Avatar, AvatarStack, IconButton } from '$lib/components/ui';

  interface Props {
    conversation: Conversation;
    onInfoClick?: () => void;
  }

  let { conversation, onInfoClick }: Props = $props();

  const participants = $derived(conversation.participants);

  const displayName = $derived.by(() => {
    if (conversation.name) return conversation.name;
    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].displayName;
    return participants.map((p) => p.displayName.split(' ')[0]).join(' and ');
  });

  const memberCount = $derived(participants.length + 1);
</script>

<header class="chat-header">
  <div class="header-left">
    <div class="avatar-container">
      {#if participants.length >= 2}
        <AvatarStack
          participants={participants.slice(0, 2).map((p) => ({
            displayName: p.displayName,
            avatarUrl: p.avatarUrl ?? undefined
          }))}
        />
      {:else if participants.length === 1}
        <Avatar
          src={participants[0].avatarUrl ?? undefined}
          alt={participants[0].displayName}
          size="md"
          fallback={participants[0].displayName.charAt(0)}
        />
      {/if}
    </div>

    <div class="header-info">
      <h2 class="name">{displayName}</h2>
      <span class="member-count">{memberCount} Members</span>
    </div>
  </div>

  <div class="header-right">
    <IconButton icon="info" shape="circle" label="Toggle chat details" onclick={onInfoClick} />
  </div>
</header>

<style>
  .chat-header {
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
  }

  .avatar-container {
    flex-shrink: 0;
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .name {
    font-size: var(--font-size-base);
    font-weight: 600;
    margin: 0;
  }

  .member-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
