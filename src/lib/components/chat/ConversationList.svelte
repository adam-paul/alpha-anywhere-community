<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { IconButton } from '$lib/components/ui';
  import { SearchBar } from '$lib/components/ui';
  import { Placeholder } from '$lib/components/ui';
  import ConversationItem from './ConversationItem.svelte';

  const chat = getChatStore();
</script>

<div class="conversation-list">
  <header class="list-header">
    <h2 class="title">Chats</h2>
    <IconButton
      icon="edit"
      shape="ghost"
      size="sm"
      label="Start new chat"
      onclick={() => chat.openNewChatModal()}
    />
  </header>

  <div class="search-container">
    <SearchBar bind:value={chat.searchQuery} placeholder="Search" />
  </div>

  <div class="list-content">
    {#each chat.filteredConversations as conversation (conversation.id)}
      <ConversationItem
        {conversation}
        isSelected={chat.activeConversationId === conversation.id}
        onclick={() => chat.selectConversation(conversation.id)}
      />
    {:else}
      <Placeholder size="sm" title="No conversations found" />
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
</style>
