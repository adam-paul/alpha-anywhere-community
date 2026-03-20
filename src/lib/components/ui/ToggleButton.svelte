<script lang="ts">
  import type { Snippet } from 'svelte';

  type Size = 'sm' | 'md';
  type Variant = 'fill' | 'outline';

  interface Props {
    active?: boolean;
    disabled?: boolean;
    size?: Size;
    variant?: Variant;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    active = false,
    disabled = false,
    size = 'md',
    variant = 'fill',
    onclick,
    children
  }: Props = $props();
</script>

<button
  class="toggle-btn size-{size} variant-{variant}"
  class:active
  type="button"
  {disabled}
  aria-pressed={active}
  {onclick}
>
  {@render children()}
</button>

<style>
  .toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: 2px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    font-family: var(--font-display);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .toggle-btn:hover:not(:disabled):not(.active) {
    border-color: var(--color-text);
    color: var(--color-text);
  }

  .toggle-btn.variant-fill.active {
    background: var(--color-text);
    border-color: var(--color-text);
    color: var(--color-surface);
  }

  .toggle-btn.variant-outline:hover:not(:disabled):not(.active) {
    border-color: var(--color-text-muted);
    color: var(--color-text-muted);
  }

  .toggle-btn.variant-outline.active {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: var(--color-bg);
  }

  .toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .size-sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
  }

  .size-md {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
  }
</style>
