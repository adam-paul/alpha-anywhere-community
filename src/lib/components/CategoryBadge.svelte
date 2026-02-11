<script lang="ts">
  import { ENGAGEMENT_CATEGORIES } from '$lib/constants';
  import type { EngagementCategory } from '$lib/types';
  import { Badge } from './ui';

  interface Props {
    category: EngagementCategory;
    showDescription?: boolean;
  }

  let { category, showDescription = false }: Props = $props();

  const meta = $derived(ENGAGEMENT_CATEGORIES[category]);

  // Map categories to CSS variable colors
  const colorMap: Record<EngagementCategory, { color: string; bg: string }> = {
    'side-by-side': { color: 'var(--color-side-by-side)', bg: 'var(--color-side-by-side-bg)' },
    'town-square': { color: 'var(--color-town-square)', bg: 'var(--color-town-square-bg)' },
    'ice-breaker': { color: 'var(--color-ice-breaker)', bg: 'var(--color-ice-breaker-bg)' },
    'trust-builder': { color: 'var(--color-trust-builder)', bg: 'var(--color-trust-builder-bg)' },
    rivalry: { color: 'var(--color-rivalry)', bg: 'var(--color-rivalry-bg)' }
  };

  const colors = $derived(colorMap[category]);
</script>

<Badge color={colors.color} background={colors.bg}>
  {meta.label}
</Badge>

{#if showDescription}
  <span class="category-description">{meta.description}</span>
{/if}

<style>
  .category-description {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-left: var(--space-2);
  }
</style>
