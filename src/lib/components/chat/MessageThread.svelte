<script lang="ts">
  import { getChatStore } from '$lib/stores/chat.svelte';
  import ChatHeader from './ChatHeader.svelte';
  import MessageBubble from './MessageBubble.svelte';
  import MessageComposer from './MessageComposer.svelte';
  import DateSeparator from './DateSeparator.svelte';
  import Placeholder from '$lib/components/Placeholder.svelte';

  const chat = getChatStore();

  // Group messages by date for date separators
  function getDateKey(date: Date): string {
    return date.toDateString();
  }

  // Check if we should show a date separator before this message
  function shouldShowDateSeparator(messages: typeof chat.activeMessages, index: number): boolean {
    if (index === 0) return true;
    const currentDate = getDateKey(messages[index].timestamp);
    const previousDate = getDateKey(messages[index - 1].timestamp);
    return currentDate !== previousDate;
  }

  // Check if this is a group chat (multiple participants)
  const isGroupChat = $derived(
    chat.activeConversation !== null && chat.activeConversation.participantIds.length > 1
  );

  function handleSend() {
    chat.sendMessage(chat.composeText);
  }

  // Auto-scroll to bottom when messages change
  // svelte-ignore non_reactive_update
  let messagesContainer: HTMLDivElement;

  $effect(() => {
    // Reference activeMessages to trigger on changes
    const _messages = chat.activeMessages;
    if (messagesContainer) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  });
</script>

<div class="message-thread">
  {#if chat.activeConversation}
    <ChatHeader
      conversation={chat.activeConversation}
      onInfoClick={() => chat.toggleDetailsPanel()}
    />

    <div class="messages-container" bind:this={messagesContainer}>
      {#if chat.activeMessages.length === 0}
        <div class="empty-messages">
          <p>No messages yet. Say hello!</p>
        </div>
      {:else}
        {#each chat.activeMessages as message, index (message.id)}
          {#if shouldShowDateSeparator(chat.activeMessages, index)}
            <DateSeparator date={message.timestamp} />
          {/if}
          <MessageBubble {message} showSenderName={isGroupChat && message.senderId !== 'me'} />
        {/each}
      {/if}
    </div>

    <MessageComposer bind:value={chat.composeText} onsubmit={handleSend} />
  {:else}
    <div class="no-conversation">
      <Placeholder
        title="No Conversation Selected"
        description="Select a conversation from the list or start a new chat"
        icon="chat"
      />
    </div>
  {/if}
</div>

<style>
  .message-thread {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg);
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) 0;
  }

  .empty-messages {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
  }

  .empty-messages p {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .no-conversation {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
</style>
