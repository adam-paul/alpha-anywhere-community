<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { getChatStore } from '$lib/stores/chat.svelte';
  import { createRealtimeStore } from '$lib/stores/realtime.svelte';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import ChatLayout from '$lib/components/chat/ChatLayout.svelte';
  import ConversationList from '$lib/components/chat/ConversationList.svelte';
  import MessageThread from '$lib/components/chat/MessageThread.svelte';
  import ChatDetails from '$lib/components/chat/ChatDetails.svelte';
  import NewChatModal from '$lib/components/chat/NewChatModal.svelte';
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

  const user = $page.data.user;

  const notificationStore = getNotificationStore();
  const voice = getVoiceStore();
  // Chat store is created at layout level — read from context here.
  const chat = getChatStore();

  // Clear the active-conversation marker when we leave /chat so the layout-
  // level chat:unread handler doesn't wrongly treat the last-viewed conv as
  // "still being viewed" from other routes.
  onDestroy(() => chat.clearActive());

  // Track remote voice participants in the active conversation via realtime broadcasts
  let remoteVoiceUsers = $state(new Set<string>());

  const activeConvVoiceRoom = $derived(
    chat.activeConversationId ? `chat:${chat.activeConversationId}` : null
  );
  const isInCall = $derived(
    voice.isConnected && activeConvVoiceRoom !== null && voice.roomName === activeConvVoiceRoom
  );
  const hasActiveCall = $derived(isInCall || remoteVoiceUsers.size > 0);

  async function handleCallClick() {
    const convId = chat.activeConversationId;
    if (!convId) return;
    const voiceRoomName = `chat:${convId}`;

    if (voice.isConnected && voice.roomName === voiceRoomName) {
      // Leave — broadcast and disconnect
      if (channel?.isConnected) {
        channel.send({ type: 'voice:left', userId: user.id });
      }
      voice.leaveRoom();
    } else {
      // Join — connect, broadcast, and notify only if starting (no one else in room)
      await voice.joinRoom(voiceRoomName);
      if (voice.isConnected && channel?.isConnected) {
        channel.send({
          type: 'voice:joined',
          userId: user.id,
          displayName: user.displayName
        });
      }
      // Only notify if we're the first in the room (starting a call, not joining one)
      if (voice.isConnected && voice.participants.size === 0) {
        fetch('/api/voice/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId })
        });
        const conv = chat.activeConversation;
        if (conv) {
          for (const p of conv.participants) {
            notificationStore.sendPush(p.id);
          }
        }
      }
    }
  }

  // Auto-open conversation if ?with= param is present (e.g., from sidebar online friends)
  const withUserId = $page.url.searchParams.get('with');
  if (withUserId) {
    const existing = chat.conversations.find(
      (c) => !c.name && c.participants.length === 1 && c.participants[0].id === withUserId
    );
    if (existing) {
      chat.selectConversation(existing.id);
    } else {
      chat.createConversation([withUserId]).then(() => {
        notificationStore.sendPush(withUserId);
      });
    }
  }

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
    remoteVoiceUsers = new Set();

    if (!convId) return;

    const ch = createRealtimeStore(`chat:conv-${convId}`);

    ch.onMessage((msg) => {
      // Chat messages
      if (isChatMessage(msg) && msg.senderId !== user.id) {
        chat.handleIncomingMessage({
          id: msg.messageId,
          conversationId: convId,
          senderId: msg.senderId,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        });
        return;
      }
      // Voice state broadcasts
      if (msg.type === 'voice:joined' && msg.userId !== user.id) {
        const next = new Set(remoteVoiceUsers);
        next.add(msg.userId as string);
        remoteVoiceUsers = next;
      } else if (msg.type === 'voice:left' && msg.userId !== user.id) {
        const next = new Set(remoteVoiceUsers);
        next.delete(msg.userId as string);
        remoteVoiceUsers = next;
      }
    });

    ch.connect();
    channel = ch;

    // Wire send once connected. chat:unread broadcasting is handled inside
    // chat.sendMessage via the global realtime store — the send function here
    // only needs to relay chat:message on the per-conversation channel.
    $effect(() => {
      if (ch.isConnected) {
        chat.setRealtimeSend((msg) => {
          ch.send(msg as { type: string; [key: string]: unknown });
        });
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
      <MessageThread onCallClick={handleCallClick} {isInCall} {hasActiveCall} />
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
