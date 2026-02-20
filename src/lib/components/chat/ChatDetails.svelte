<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { getUserStore } from '$lib/stores/user.svelte';
  import { Avatar, Icon, IconButton, Button, Toggle } from '$lib/components/ui';
  import { MOCK_STUDENTS } from '$lib/mock-data';
  import type { Student } from '$lib/types';

  const chat = getChatStore();
  const userStore = getUserStore();

  // Get display name
  const displayName = $derived.by(() => {
    const conv = chat.activeConversation;
    if (!conv) return '';
    if (conv.name) return conv.name;

    const participants = conv.participantIds
      .map((id) => MOCK_STUDENTS.find((s) => s.id === id))
      .filter((s): s is Student => s !== undefined);

    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].displayName;
    return participants.map((p) => p.displayName.split(' ')[0]).join(' and ');
  });

  // Resolve participants
  const participants = $derived.by(() => {
    const conv = chat.activeConversation;
    if (!conv) return [];

    return conv.participantIds
      .map((id) => MOCK_STUDENTS.find((s) => s.id === id))
      .filter((s): s is Student => s !== undefined);
  });

  function toggleMute() {
    if (chat.activeConversation) {
      chat.activeConversation.isMuted = !chat.activeConversation.isMuted;
    }
  }
</script>

<div class="chat-details">
  <header class="details-header">
    <h2 class="title">Details</h2>
  </header>

  <div class="details-content">
    <section class="section">
      <div class="chat-name-row">
        <span class="chat-name">{displayName}</span>
        <IconButton icon="edit" shape="ghost" size="sm" label="Edit chat name" />
      </div>
    </section>

    <section class="section">
      <div class="mute-row">
        <span class="mute-label">Mute Chat</span>
        <Toggle
          checked={chat.activeConversation?.isMuted ?? false}
          onchange={toggleMute}
          label="Mute chat"
        />
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">Members</h3>
        <button class="add-btn">
          <Icon name="plus" size={14} />
          <span>Add</span>
        </button>
      </div>

      <div class="members-list">
        <!-- Current user -->
        {#if userStore.user}
          <div class="member-item">
            <Avatar
              src={userStore.user.avatarUrl}
              alt={userStore.user.displayName}
              size="sm"
              fallback={userStore.user.displayName.charAt(0)}
            />
            <div class="member-info">
              <span class="member-name">{userStore.user.displayName}</span>
              <span class="member-status">You</span>
            </div>
          </div>
        {/if}

        <!-- Other participants -->
        {#each participants as participant (participant.id)}
          <div class="member-item">
            <Avatar
              src={participant.avatarUrl}
              alt={participant.displayName}
              size="sm"
              fallback={participant.displayName.charAt(0)}
            />
            <div class="member-info">
              <span class="member-name">{participant.displayName}</span>
            </div>
            <IconButton icon="more" shape="ghost" size="sm" label="Member options" />
          </div>
        {/each}
      </div>
    </section>
  </div>

  <footer class="details-footer">
    <Button variant="secondary" size="sm">Leave Chat</Button>
  </footer>
</div>

<style>
  .chat-details {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .details-header {
    display: flex;
    align-items: center;
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    margin: 0;
  }

  .details-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .section {
    padding: var(--space-3) 0;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .section:last-child {
    border-bottom: none;
  }

  .chat-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .chat-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .mute-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mute-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    margin: 0;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-primary);
    font-size: var(--font-size-xs);
    font-weight: 600;
    transition: opacity var(--transition-fast);
  }

  .add-btn:hover {
    opacity: 0.8;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius);
  }

  .member-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .member-name {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .member-status {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .details-footer {
    display: flex;
    align-items: center;
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
    border-top: var(--border-width) solid var(--color-border);
  }

  .details-footer :global(button) {
    width: 100%;
  }
</style>
