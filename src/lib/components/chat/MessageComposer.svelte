<script lang="ts">
  import { IconButton } from '$lib/components/ui';

  interface Props {
    value: string;
    onchange?: (value: string) => void;
    onsubmit?: () => void;
  }

  let { value = $bindable(), onchange, onsubmit }: Props = $props();

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

<div class="message-composer">
  <IconButton icon="plus" shape="circle" label="Add attachment" />

  <input
    type="text"
    class="input"
    placeholder="Send a message"
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
  />

  <IconButton
    icon="send"
    shape="circle"
    label="Send message"
    onclick={handleSend}
    disabled={!value.trim()}
  />
</div>

<style>
  .message-composer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    height: var(--panel-bar-height);
    box-sizing: border-box;
    border-top: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
  }

  .input {
    flex: 1;
    height: 40px;
    padding: 0 var(--space-4);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-chat);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .input::placeholder {
    color: var(--color-text-muted);
  }

  .input:focus {
    border-color: var(--color-primary);
  }
</style>
