<script lang="ts">
  import type { Conversation } from '$lib/types';
  import { Avatar, AvatarStack } from '$lib/components/ui';
  import { getChatStore } from '$lib/stores/chat.svelte';

  interface Props {
    conversation: Conversation;
    isSelected?: boolean;
    onclick?: () => void;
  }

  let { conversation, isSelected = false, onclick }: Props = $props();

  const chat = getChatStore();

  const participants = $derived(conversation.participants);

  const displayName = $derived.by(() => {
    if (conversation.name) return conversation.name;
    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].displayName;
    return participants.map((p) => p.displayName.split(' ')[0]).join(', ');
  });

  // Format timestamp
  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return date
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        .toLowerCase();
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // Get last message preview with sender prefix
  const lastMessagePreview = $derived.by(() => {
    if (!conversation.lastMessage) return '';
    const prefix = conversation.lastMessage.senderId === chat.currentUserId ? 'You: ' : '';
    return prefix + conversation.lastMessage.content;
  });
</script>

<button class="conversation-item" class:selected={isSelected} {onclick} type="button">
  <div class="avatar-container">
    {#if participants.length >= 2}
      <AvatarStack
        participants={participants.slice(0, 2).map((p) => ({
          displayName: p.displayName,
          avatarUrl: p.avatarUrl ?? undefined
        }))}
      />
    {:else}
      <Avatar
        src={participants[0]?.avatarUrl ?? undefined}
        alt={participants[0]?.displayName ?? ''}
        size="md"
        fallback={participants[0]?.displayName.charAt(0) ?? '?'}
      />
    {/if}
    <span class="online-indicator"></span>
  </div>

  <div class="content">
    <div class="header">
      <span class="name">{displayName}</span>
      {#if conversation.lastMessage}
        <span class="timestamp">{formatTimestamp(conversation.lastMessage.timestamp)}</span>
      {/if}
    </div>
    <div class="preview-row">
      <span class="preview">{lastMessagePreview}</span>
      {#if conversation.unreadCount > 0}
        <span class="unread-indicator"></span>
      {/if}
    </div>
  </div>
</button>

<style>
  .conversation-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .conversation-item:hover {
    background: var(--color-bg);
  }

  .conversation-item.selected {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .conversation-item.selected .timestamp,
  .conversation-item.selected .preview {
    color: var(--color-on-primary);
    opacity: 0.8;
  }

  .avatar-container {
    position: relative;
    flex-shrink: 0;
  }

  .online-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    background: var(--color-online);
    border: 2px solid var(--color-surface);
    border-radius: 50%;
  }

  .selected .online-indicator {
    border-color: var(--color-primary);
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-2);
  }

  .name {
    font-weight: 600;
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timestamp {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .preview-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .preview {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .unread-indicator {
    width: 8px;
    height: 8px;
    background: var(--color-primary);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .selected .unread-indicator {
    background: var(--color-surface);
  }
</style>
