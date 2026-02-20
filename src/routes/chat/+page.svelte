<script lang="ts">
  import { createChatStore } from '$lib/stores/chat.svelte';
  import ChatLayout from '$lib/components/chat/ChatLayout.svelte';
  import ConversationList from '$lib/components/chat/ConversationList.svelte';
  import MessageThread from '$lib/components/chat/MessageThread.svelte';
  import ChatDetails from '$lib/components/chat/ChatDetails.svelte';
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte';

  // Create chat store (provides context to child components)
  const chat = createChatStore();
</script>

<svelte:head>
  <title>Chat - Alpha Anywhere Community</title>
</svelte:head>

<div class="chat-page">
  <ChatLayout>
    {#snippet conversationList()}
      <ConversationList />
    {/snippet}

    {#snippet messageThread()}
      <MessageThread />
    {/snippet}

    {#snippet detailsPanel()}
      <ChatDetails />
    {/snippet}
  </ChatLayout>
</div>

<NewChatModal />

<style>
  .chat-page {
    /* Counteract AppShell's content padding to go edge-to-edge */
    margin: calc(-1 * var(--space-6));
    height: calc(100% + var(--space-6) * 2);
    display: flex;
    flex-direction: column;
  }
</style>
