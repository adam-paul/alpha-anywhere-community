<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getChatStore } from '$lib/stores/chat.svelte';

  interface Props {
    conversationList: Snippet;
    messageThread: Snippet;
    detailsPanel: Snippet;
  }

  let { conversationList, messageThread, detailsPanel }: Props = $props();

  const chat = getChatStore();
</script>

<div class="chat-layout">
  <aside class="conversation-list-panel">
    {@render conversationList()}
  </aside>

  <main class="message-thread-panel">
    {@render messageThread()}
  </main>

  {#if chat.isDetailsPanelOpen}
    <aside class="details-panel">
      {@render detailsPanel()}
    </aside>
  {/if}
</div>

<style>
  .chat-layout {
    display: flex;
    height: 100%;
    min-height: 0;
  }

  .conversation-list-panel {
    width: 280px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    border-right: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }

  .message-thread-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .details-panel {
    width: 300px;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    border-left: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }
</style>
