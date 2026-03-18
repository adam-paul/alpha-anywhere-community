<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';

  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    open: boolean;
    onclose: () => void;
    title: string;
    content: Snippet;
    footer?: Snippet;
    size?: Size;
  }

  let { open, onclose, title, content, footer, size = 'sm' }: Props = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" role="presentation" onclick={handleBackdropClick}>
    <div class="modal size-{size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <h2 id="modal-title" class="modal-title">{title}</h2>
        <IconButton icon="x" shape="ghost" label="Close" onclick={onclose} />
      </header>

      <div class="modal-content">
        {@render content()}
      </div>

      {#if footer}
        <footer class="modal-footer">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--color-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    width: 100%;
    max-height: 80vh;
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .modal-title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    margin: 0;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  .size-sm {
    max-width: 400px;
  }

  .size-md {
    max-width: 560px;
  }

  .size-lg {
    max-width: 720px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: var(--border-width) solid var(--color-border);
  }
</style>
