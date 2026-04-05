<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import { Avatar, Icon, Button, Modal } from '$lib/components/ui';
  import { SearchBar } from '$lib/components/ui';
  import { Placeholder } from '$lib/components/ui';

  const chat = getChatStore();
  const notificationStore = getNotificationStore();

  let searchQuery = $state('');
  let selectedIds = $state<string[]>([]);

  const filteredFriends = $derived.by(() => {
    if (!searchQuery.trim()) return chat.friends;

    const query = searchQuery.toLowerCase().trim();
    return chat.friends.filter(
      (f) => f.displayName.toLowerCase().includes(query) || f.handle.toLowerCase().includes(query)
    );
  });

  function toggleStudent(id: string) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter((i) => i !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  }

  async function handleCreate() {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    await chat.createConversation(ids);
    for (const id of ids) {
      notificationStore.sendPush(id);
    }
    searchQuery = '';
    selectedIds = [];
  }

  function handleClose() {
    chat.closeNewChatModal();
    searchQuery = '';
    selectedIds = [];
  }
</script>

<Modal open={chat.isNewChatModalOpen} onclose={handleClose} title="New Chat">
  {#snippet content()}
    <div class="search-container">
      <SearchBar bind:value={searchQuery} placeholder="Search friends" />
    </div>

    {#if selectedIds.length > 0}
      <div class="selected-preview">
        <span class="selected-label">Selected:</span>
        <div class="selected-names">
          {#each selectedIds as id}
            {@const friend = chat.friends.find((f) => f.id === id)}
            {#if friend}
              <span class="selected-name">{friend.displayName}</span>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    <div class="students-list">
      {#each filteredFriends as friend (friend.id)}
        <button
          class="student-item"
          class:selected={selectedIds.includes(friend.id)}
          onclick={() => toggleStudent(friend.id)}
        >
          <Avatar
            src={friend.avatarUrl ?? undefined}
            alt={friend.displayName}
            size="sm"
            fallback={friend.displayName.charAt(0)}
          />
          <div class="student-info">
            <span class="student-name">{friend.displayName}</span>
            <span class="student-handle">@{friend.handle}</span>
          </div>
          {#if selectedIds.includes(friend.id)}
            <div class="check-icon">
              <Icon name="check" size={16} />
            </div>
          {/if}
        </button>
      {:else}
        <Placeholder size="sm" title="No friends found" />
      {/each}
    </div>
  {/snippet}
  {#snippet footer()}
    <Button variant="secondary" onclick={handleClose}>Cancel</Button>
    <Button variant="primary" onclick={handleCreate} disabled={selectedIds.length === 0}>
      Create Chat
    </Button>
  {/snippet}
</Modal>

<style>
  .search-container {
    margin-bottom: var(--space-4);
  }

  .search-container :global(.search-bar) {
    max-width: none;
  }

  .selected-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    margin-bottom: var(--space-4);
  }

  .selected-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .selected-names {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .selected-name {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-primary);
  }

  .students-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .student-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    width: 100%;
    text-align: left;
    background: transparent;
    border: var(--border-width) solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .student-item:hover {
    background: var(--color-bg);
  }

  .student-item.selected {
    background: var(--color-bg);
    border-color: var(--color-primary);
  }

  .student-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .student-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .student-handle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .check-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-radius: 50%;
  }
</style>
