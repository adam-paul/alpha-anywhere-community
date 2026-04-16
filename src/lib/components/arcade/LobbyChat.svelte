<script lang="ts">
  import type { LobbyMessage } from '$lib/types';
  import { Placeholder } from '$lib/components/ui';
  import LobbyMessageBubble from './LobbyMessageBubble.svelte';
  import MessageComposer from '$lib/components/chat/MessageComposer.svelte';

  interface Props {
    messages: LobbyMessage[];
    currentUserId: string;
    avatarsByUserId?: Record<string, string | null>;
    composeText: string;
    sendError: string | null;
    onsubmit: () => void;
  }

  let {
    messages,
    currentUserId,
    avatarsByUserId = {},
    composeText = $bindable(),
    sendError,
    onsubmit
  }: Props = $props();

  // svelte-ignore non_reactive_update
  let scrollContainer: HTMLDivElement;

  $effect(() => {
    // Reference messages.length so the effect re-runs on new messages.
    const _count = messages.length;
    if (scrollContainer) {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  });
</script>

<div class="lobby-chat">
  <div class="messages-container" bind:this={scrollContainer}>
    {#if messages.length === 0}
      <Placeholder size="sm" title="No messages yet." description="Say hello to anyone here." />
    {:else}
      {#each messages as message (message.localId)}
        <LobbyMessageBubble
          {message}
          {currentUserId}
          avatarUrl={avatarsByUserId[message.senderId] ?? null}
        />
      {/each}
    {/if}
  </div>

  <MessageComposer bind:value={composeText} error={sendError} {onsubmit} />
</div>

<style>
  .lobby-chat {
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
</style>
