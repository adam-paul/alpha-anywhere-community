<script lang="ts">
  import { IconButton, Input } from '$lib/components/ui';

  interface Props {
    value: string;
    error?: string | null;
    onchange?: (value: string) => void;
    onsubmit?: () => void;
  }

  let { value = $bindable(), error = null, onchange, onsubmit }: Props = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    onchange?.(target.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onsubmit?.();
      }
    }
  }

  function handleSend() {
    if (value.trim()) {
      onsubmit?.();
    }
  }
</script>

<div class="composer-wrapper">
  {#if error}
    <div class="composer-error" role="alert">{error}</div>
  {/if}

  <div class="message-composer">
    <IconButton icon="plus" shape="circle" label="Add attachment" />

    <div class="input-wrapper">
      <Input {value} placeholder="Send a message" oninput={handleInput} onkeydown={handleKeydown} />
    </div>

    <IconButton
      icon="send"
      shape="circle"
      label="Send message"
      onclick={handleSend}
      disabled={!value.trim()}
    />
  </div>
</div>

<style>
  .composer-wrapper {
    border-top: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }

  .composer-error {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    color: var(--color-danger, #b91c1c);
    background: var(--color-danger-bg, #fef2f2);
    border-bottom: var(--border-width) solid var(--color-border);
    line-height: 1.4;
  }

  .message-composer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
  }

  .input-wrapper {
    flex: 1;
  }

  .input-wrapper :global(.input) {
    border-radius: var(--radius-lg);
  }
</style>
