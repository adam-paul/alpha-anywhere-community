<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { Icon } from '$lib/components/ui';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import ConversationItem from './ConversationItem.svelte';

  const chat = getChatStore();
</script>

<div class="conversation-list">
  <header class="list-header">
    <h2 class="title">Chats</h2>
    <button
      class="new-chat-btn"
      onclick={() => chat.openNewChatModal()}
      aria-label="Start new chat"
    >
      <Icon name="edit" size={18} />
    </button>
  </header>

  <div class="search-container">
    <SearchBar
      bind:value={chat.searchQuery}
      placeholder="Search"
    />
  </div>

  <div class="list-content">
    {#each chat.filteredConversations as conversation (conversation.id)}
      <ConversationItem
        {conversation}
        isSelected={chat.activeConversationId === conversation.id}
        onclick={() => chat.selectConversation(conversation.id)}
      />
    {:else}
      <div class="empty-state">
        <p>No conversations found</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .conversation-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    margin: 0;
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
  }

  .new-chat-btn:hover {
    color: var(--color-primary);
  }

  .search-container {
    padding: var(--space-3) var(--space-4);
  }

  .search-container :global(.search-bar) {
    max-width: none;
  }

  .list-content {
    flex: 1;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-sm);
  }
</style>
