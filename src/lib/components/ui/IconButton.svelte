<script lang="ts">
  import type { IconName } from './types';
  import Icon from './Icon.svelte';

  type Shape = 'ghost' | 'circle';
  type Size = 'sm' | 'md';

  interface Props {
    icon: IconName;
    shape?: Shape;
    size?: Size;
    label: string;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
  }

  let { icon, shape = 'ghost', size = 'md', label, disabled = false, onclick }: Props = $props();
</script>

<button
  class="icon-btn shape-{shape} size-{size}"
  {disabled}
  {onclick}
  aria-label={label}
  type="button"
>
  <Icon name={icon} size={size === 'sm' ? 16 : 20} />
</button>

<style>
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .icon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Shapes */
  .shape-ghost {
    padding: var(--space-1);
    background: transparent;
    border: none;
  }

  .shape-ghost:hover:not(:disabled) {
    color: var(--color-primary);
  }

  .shape-circle {
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: 50%;
  }

  .shape-circle:hover:not(:disabled) {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  /* Sizes */
  .size-sm {
    width: var(--avatar-size-sm);
    height: var(--avatar-size-sm);
  }

  .size-md.shape-ghost {
    padding: var(--space-1);
    width: auto;
    height: auto;
  }

  .size-md.shape-circle {
    width: 2.25rem;
    height: 2.25rem;
  }
</style>
