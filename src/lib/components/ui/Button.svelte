<script lang="ts">
  import type { Snippet } from 'svelte';

  type Size = 'sm' | 'md' | 'lg';
  type Variant = 'primary' | 'secondary' | 'ghost';

  interface Props {
    size?: Size;
    variant?: Variant;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    size = 'md',
    variant = 'secondary',
    disabled = false,
    type = 'button',
    onclick,
    children
  }: Props = $props();
</script>

<button class="btn btn-{variant} size-{size}" {type} {disabled} {onclick}>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    cursor: pointer;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .btn:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .size-sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
  }

  .size-md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
  }

  .size-lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-base);
  }

  /* Variants */
  .btn-primary {
    background: var(--color-primary);
    border-color: var(--color-border);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover, var(--color-primary));
  }

  .btn-secondary {
    background: var(--color-surface);
    color: var(--color-text);
  }

  .btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--color-text-muted);
  }

  .btn-ghost:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text);
    box-shadow: none;
    transform: none;
  }
</style>
