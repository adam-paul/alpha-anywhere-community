<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { createChatStore } from '$lib/stores/chat.svelte';
  import ChatLayout from '$lib/components/chat/ChatLayout.svelte';
  import ConversationList from '$lib/components/chat/ConversationList.svelte';
  import MessageThread from '$lib/components/chat/MessageThread.svelte';
  import ChatDetails from '$lib/components/chat/ChatDetails.svelte';
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte';
  import type { Message } from '$lib/types';

  let { data } = $props();
  const user = $page.data.user;

  const chat = createChatStore({
    conversations: data.conversations,
    currentUserId: user.id,
    friends: data.friends
  });

  // Per-conversation WebSocket lifecycle
  let ws: WebSocket | null = null;

  $effect(() => {
    const convId = chat.activeConversationId;

    // Clean up previous connection
    if (ws) {
      ws.close(1000);
      ws = null;
      chat.setRealtimeSend(null);
    }

    if (!convId) return;

    const socket = new WebSocket(`wss://ws.alpha-community.school/channel/chat:conv-${convId}`);

    socket.onopen = () => {
      chat.setRealtimeSend((msg) => socket.send(JSON.stringify(msg)));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat:message' && data.senderId && data.senderId !== user.id) {
          const msg: Message = {
            id: data.messageId,
            conversationId: convId,
            senderId: data.senderId,
            content: data.content,
            timestamp: new Date(data.timestamp)
          };
          chat.handleIncomingMessage(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      chat.setRealtimeSend(null);
    };

    ws = socket;

    return () => {
      socket.close(1000);
      chat.setRealtimeSend(null);
    };
  });

  onDestroy(() => {
    if (ws) {
      ws.close(1000);
      ws = null;
    }
  });
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
