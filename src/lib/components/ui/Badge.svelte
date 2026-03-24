<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'default' | 'success' | 'warning' | 'info' | 'danger';

  interface Props {
    variant?: Variant;
    color?: string; // Custom text color override
    background?: string; // Custom background override
    borderColor?: string; // Custom border color (defaults to text color)
    children: Snippet;
  }

  let { variant = 'default', color, background, borderColor, children }: Props = $props();

  // Allow custom colors to override variant colors
  const style = $derived(
    color || background || borderColor
      ? `${color ? `--badge-color: ${color};` : ''} ${background ? `--badge-bg: ${background};` : ''} ${borderColor ? `--badge-border: ${borderColor};` : ''}`
      : undefined
  );
</script>

<span class="badge variant-{variant}" {style}>
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border: 2px solid var(--badge-border, var(--badge-color, var(--color-text)));
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    color: var(--badge-color, var(--color-text));
    background: var(--badge-bg, var(--color-surface));
  }

  /* Variants */
  .variant-default {
    --badge-color: var(--color-text);
    --badge-bg: var(--color-surface);
  }

  .variant-success {
    --badge-color: var(--color-side-by-side);
    --badge-bg: var(--color-side-by-side-bg);
  }

  .variant-warning {
    --badge-color: var(--color-trust-builder);
    --badge-bg: var(--color-trust-builder-bg);
  }

  .variant-info {
    --badge-color: var(--color-ice-breaker);
    --badge-bg: var(--color-ice-breaker-bg);
  }

  .variant-danger {
    --badge-color: var(--color-rivalry);
    --badge-bg: var(--color-rivalry-bg);
  }
</style>
