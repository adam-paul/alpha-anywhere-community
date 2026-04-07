<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    interactive?: boolean;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let { interactive = false, disabled = false, onclick, children }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (disabled || !onclick) return;
    onclick(e);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!interactive || disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as unknown as MouseEvent);
    }
  }
</script>

<div
  class="card"
  class:interactive
  class:disabled
  role={interactive ? 'button' : undefined}
  tabindex={interactive && !disabled ? 0 : undefined}
  aria-disabled={interactive ? disabled : undefined}
  onclick={interactive ? handleClick : undefined}
  onkeydown={interactive ? handleKeydown : undefined}
>
  {@render children()}
</div>

<style>
  .card {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    overflow: hidden;
  }

  .card.interactive {
    cursor: pointer;
    outline: none;
    user-select: none;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .card.interactive:hover:not(.disabled) {
    transform: translateY(-2px) scale(var(--hover-scale, 1.02));
    box-shadow: 4px 4px 0 var(--color-border);
  }

  .card.interactive:active:not(.disabled) {
    transform: scale(var(--active-scale, 0.98));
    box-shadow: 2px 2px 0 var(--color-border);
  }

  .card.interactive:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
  }

  .card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
