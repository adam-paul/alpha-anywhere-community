<script lang="ts">
  import type { Message } from '$lib/types';
  import { Avatar } from '$lib/components/ui';
  import { getChatStore } from '$lib/stores/chat.svelte';

  interface Props {
    message: Message;
    showSenderName?: boolean;
  }

  let { message, showSenderName = false }: Props = $props();

  const chat = getChatStore();

  const isSent = $derived(message.senderId === chat.currentUserId);
  const isPending = $derived(message.status === 'pending');

  const sender = $derived(
    !isSent ? (chat.activeParticipants.find((p) => p.id === message.senderId) ?? null) : null
  );

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

<div class="message" class:sent={isSent} class:pending={isPending}>
  {#if !isSent && sender}
    <Avatar
      src={sender.avatarUrl ?? undefined}
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
    </div>

    <span class="timestamp">
      {#if isPending}
        sending<span class="dots" aria-hidden="true">…</span>
      {:else}
        {formatTime(message.timestamp)}
      {/if}
    </span>
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
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    max-width: 100%;
  }

  .message.sent .bubble {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-on-primary);
  }

  .content {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    word-wrap: break-word;
  }

  .image-attachment {
    margin-bottom: var(--space-2);
    border-radius: var(--radius-sm);
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

  .timestamp {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    padding: 0 var(--space-2);
  }

  .message.sent .timestamp {
    text-align: right;
  }

  .message.pending .bubble {
    opacity: 0.55;
  }

  .message.pending .timestamp {
    font-style: italic;
  }

  .dots {
    display: inline-block;
    animation: pending-pulse 1s ease-in-out infinite;
  }

  @keyframes pending-pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
</style>
