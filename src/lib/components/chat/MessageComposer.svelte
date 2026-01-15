<script lang="ts">
  import { Icon, Button } from '$lib/components/ui';

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
  <button class="attachment-btn" type="button" aria-label="Add attachment">
    <Icon name="plus" size={20} />
  </button>

  <input
    type="text"
    class="input"
    placeholder="Send a message"
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
  />

  <button
    class="send-btn"
    type="button"
    onclick={handleSend}
    disabled={!value.trim()}
    aria-label="Send message"
  >
    <Icon name="send" size={18} />
  </button>
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

  .attachment-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .attachment-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
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

  .send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
