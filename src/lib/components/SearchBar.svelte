<script lang="ts">
  import { Icon } from './ui';

  interface Props {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    placeholder = 'Search...',
    disabled = false,
    onchange
  }: Props = $props();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    onchange?.(target.value);
  }
</script>

<div class="search-bar" class:disabled>
  <Icon name="search" size={18} />
  <input type="text" {value} {placeholder} {disabled} oninput={handleInput} />
</div>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    transition: all var(--transition-fast);
    flex: 1;
    max-width: 400px;
  }

  .search-bar:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha, rgba(59, 130, 246, 0.2));
  }

  .search-bar.disabled {
    opacity: 0.5;
  }

  .search-bar :global(svg) {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    outline: none;
  }

  input::placeholder {
    color: var(--color-text-muted);
  }

  input:disabled {
    cursor: not-allowed;
  }
</style>
