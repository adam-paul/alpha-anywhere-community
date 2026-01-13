<script lang="ts">
  import type { Conversation, Student } from '$lib/types';
  import { Avatar } from '$lib/components/ui';
  import { MOCK_STUDENTS } from '$lib/mock-data';

  interface Props {
    conversation: Conversation;
    isSelected?: boolean;
    onclick?: () => void;
  }

  let { conversation, isSelected = false, onclick }: Props = $props();

  // Resolve participants from IDs
  const participants = $derived(
    conversation.participantIds
      .map(id => MOCK_STUDENTS.find(s => s.id === id))
      .filter((s): s is Student => s !== undefined)
  );

  // Get display name (custom name or participant names)
  const displayName = $derived(() => {
    if (conversation.name) return conversation.name;
    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].displayName;
    return participants.map(p => p.displayName.split(' ')[0]).join(', ');
  });

  // Format timestamp
  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
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
  const lastMessagePreview = $derived(() => {
    if (!conversation.lastMessage) return '';
    const prefix = conversation.lastMessage.senderId === 'me' ? 'You: ' : '';
    return prefix + conversation.lastMessage.content;
  });
</script>

<button
  class="conversation-item"
  class:selected={isSelected}
  onclick={onclick}
  type="button"
>
  <div class="avatar-container">
    {#if participants.length >= 2}
      <div class="stacked-avatars">
        <Avatar
          src={participants[0]?.avatarUrl}
          alt={participants[0]?.displayName ?? ''}
          size="sm"
          fallback={participants[0]?.displayName.charAt(0) ?? '?'}
        />
        <Avatar
          src={participants[1]?.avatarUrl}
          alt={participants[1]?.displayName ?? ''}
          size="sm"
          fallback={participants[1]?.displayName.charAt(0) ?? '?'}
        />
      </div>
    {:else}
      <Avatar
        src={participants[0]?.avatarUrl}
        alt={participants[0]?.displayName ?? ''}
        size="md"
        fallback={participants[0]?.displayName.charAt(0) ?? '?'}
      />
    {/if}
    <span class="online-indicator"></span>
  </div>

  <div class="content">
    <div class="header">
      <span class="name">{displayName()}</span>
      {#if conversation.lastMessage}
        <span class="timestamp">{formatTimestamp(conversation.lastMessage.timestamp)}</span>
      {/if}
    </div>
    <div class="preview-row">
      <span class="preview">{lastMessagePreview()}</span>
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
    color: white;
  }

  .conversation-item.selected .timestamp,
  .conversation-item.selected .preview {
    color: rgba(255, 255, 255, 0.8);
  }

  .avatar-container {
    position: relative;
    flex-shrink: 0;
  }

  .stacked-avatars {
    position: relative;
    width: 40px;
    height: 40px;
  }

  .stacked-avatars :global(.avatar:first-child) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .stacked-avatars :global(.avatar:last-child) {
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 0;
  }

  .online-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    background: #22c55e;
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
    background: white;
  }
</style>
