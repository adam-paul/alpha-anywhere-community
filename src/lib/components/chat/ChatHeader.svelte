<script lang="ts">
  import type { Conversation, Student } from '$lib/types';
  import { Avatar, Icon, Button } from '$lib/components/ui';
  import { MOCK_STUDENTS } from '$lib/mock-data';

  interface Props {
    conversation: Conversation;
    onInfoClick?: () => void;
  }

  let { conversation, onInfoClick }: Props = $props();

  // Resolve participants
  const participants = $derived(
    conversation.participantIds
      .map((id) => MOCK_STUDENTS.find((s) => s.id === id))
      .filter((s): s is Student => s !== undefined)
  );

  // Get display name
  const displayName = $derived.by(() => {
    if (conversation.name) return conversation.name;
    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].displayName;
    return participants.map((p) => p.displayName.split(' ')[0]).join(' and ');
  });

  // Get member count
  const memberCount = $derived(participants.length + 1); // +1 for current user
</script>

<header class="chat-header">
  <div class="header-left">
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
      {:else if participants.length === 1}
        <Avatar
          src={participants[0].avatarUrl}
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
    <button class="info-btn" onclick={onInfoClick} aria-label="Toggle chat details">
      <Icon name="info" size={20} />
    </button>
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

  .info-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: var(--border-width) solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .info-btn:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
</style>
