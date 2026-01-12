<script lang="ts">
  import type { EngagementCategory } from '../types';
  import { ENGAGEMENT_CATEGORIES } from '../types';

  interface Props {
    category: EngagementCategory;
    showDescription?: boolean;
  }

  let { category, showDescription = false }: Props = $props();

  const meta = $derived(ENGAGEMENT_CATEGORIES[category]);
</script>

<span
  class="badge category-badge"
  class:side-by-side={category === 'side-by-side'}
  class:town-square={category === 'town-square'}
  class:ice-breaker={category === 'ice-breaker'}
  class:trust-builder={category === 'trust-builder'}
  class:rivalry={category === 'rivalry'}
  title={meta.description}
>
  {meta.label}
</span>

{#if showDescription}
  <span class="category-description">{meta.description}</span>
{/if}

<style>
  .category-badge {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .side-by-side {
    background: var(--color-side-by-side-bg);
    color: var(--color-side-by-side);
    border-color: var(--color-side-by-side);
  }

  .town-square {
    background: var(--color-town-square-bg);
    color: var(--color-town-square);
    border-color: var(--color-town-square);
  }

  .ice-breaker {
    background: var(--color-ice-breaker-bg);
    color: var(--color-ice-breaker);
    border-color: var(--color-ice-breaker);
  }

  .trust-builder {
    background: var(--color-trust-builder-bg);
    color: var(--color-trust-builder);
    border-color: var(--color-trust-builder);
  }

  .rivalry {
    background: var(--color-rivalry-bg);
    color: var(--color-rivalry);
    border-color: var(--color-rivalry);
  }

  .category-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-left: var(--space-2);
  }
</style>
