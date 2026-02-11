<script lang="ts">
  import type { Message, Student } from '$lib/types';
  import { Avatar } from '$lib/components/ui';
  import { MOCK_STUDENTS } from '$lib/mock-data';

  interface Props {
    message: Message;
    showSenderName?: boolean;
  }

  let { message, showSenderName = false }: Props = $props();

  const isSent = $derived(message.senderId === 'me');

  // Resolve sender for received messages
  const sender = $derived(!isSent ? MOCK_STUDENTS.find((s) => s.id === message.senderId) : null);

  function formatTime(date: Date): string {
    return date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      .toLowerCase();
  }
</script>

<div class="message" class:sent={isSent}>
  {#if !isSent && sender}
    <Avatar
      src={sender.avatarUrl}
      alt={sender.displayName}
      size="sm"
      fallback={sender.displayName.charAt(0)}
    />
  {/if}

  <div class="bubble-container">
    {#if showSenderName && sender && !isSent}
      <span class="sender-name">{sender.displayName}</span>
    {/if}

    <div class="bubble">
      {#if message.imageUrl}
        <div class="image-attachment">
          <img src={message.imageUrl} alt="Attachment" />
        </div>
      {/if}

      <p class="content">{message.content}</p>

      {#if message.reactions && message.reactions.length > 0}
        <div class="reactions">
          {#each message.reactions as reaction}
            <span class="reaction">{reaction}</span>
          {/each}
        </div>
      {/if}
    </div>

    <span class="timestamp">{formatTime(message.timestamp)}</span>
  </div>
</div>

<style>
  .message {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
    max-width: 70%;
  }

  .message.sent {
    flex-direction: row-reverse;
    margin-left: auto;
  }

  .bubble-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .message.sent .bubble-container {
    align-items: flex-end;
  }

  .sender-name {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    padding-left: var(--space-2);
  }

  .bubble {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-chat);
    padding: var(--space-3);
    max-width: 100%;
  }

  .message.sent .bubble {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .content {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    word-wrap: break-word;
  }

  .image-attachment {
    margin-bottom: var(--space-2);
    border-radius: var(--radius-chat-sm);
    overflow: hidden;
  }

  .image-attachment img {
    display: block;
    max-width: 200px;
    max-height: 200px;
    width: 100%;
    height: auto;
    object-fit: cover;
    background: var(--color-bg);
  }

  .reactions {
    display: flex;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }

  .reaction {
    font-size: var(--font-size-sm);
  }

  .timestamp {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    padding: 0 var(--space-2);
  }

  .message.sent .timestamp {
    text-align: right;
  }
</style>
