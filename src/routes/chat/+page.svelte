<script lang="ts">
  import { page } from '$app/stores';
  import { createChatStore } from '$lib/stores/chat.svelte';
  import { createRealtimeStore } from '$lib/stores/realtime.svelte';
  import ChatLayout from '$lib/components/chat/ChatLayout.svelte';
  import ConversationList from '$lib/components/chat/ConversationList.svelte';
  import MessageThread from '$lib/components/chat/MessageThread.svelte';
  import ChatDetails from '$lib/components/chat/ChatDetails.svelte';
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte';
  import type { Message } from '$lib/types';
  import type { ChatBroadcast } from '@alpha/shared/types';

  function isChatMessage(data: unknown): data is ChatBroadcast {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'chat:message' &&
      'messageId' in data &&
      typeof (data as ChatBroadcast).messageId === 'string' &&
      'senderId' in data &&
      typeof (data as ChatBroadcast).senderId === 'string' &&
      'content' in data &&
      typeof (data as ChatBroadcast).content === 'string' &&
      'timestamp' in data
    );
  }

  let { data } = $props();
  const user = $page.data.user;

  // svelte-ignore state_referenced_locally
  const chat = createChatStore({
    conversations: data.conversations,
    currentUserId: user.id,
    friends: data.friends
  });

  // Per-conversation WebSocket lifecycle via realtime store
  let channel: ReturnType<typeof createRealtimeStore> | null = null;

  $effect(() => {
    const convId = chat.activeConversationId;

    // Clean up previous channel
    if (channel) {
      channel.disconnect();
      channel = null;
      chat.setRealtimeSend(null);
    }

    if (!convId) return;

    const ch = createRealtimeStore(`chat:conv-${convId}`);

    ch.onMessage((msg) => {
      if (!isChatMessage(msg) || msg.senderId === user.id) return;
      chat.handleIncomingMessage({
        id: msg.messageId,
        conversationId: convId,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      });
    });

    ch.connect();
    channel = ch;

    // Wire send once connected
    $effect(() => {
      if (ch.isConnected) {
        chat.setRealtimeSend((msg) => ch.send(msg as { type: string; [key: string]: unknown }));
      }
    });

    return () => {
      ch.disconnect();
      chat.setRealtimeSend(null);
    };
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
