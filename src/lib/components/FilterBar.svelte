<script lang="ts">
  import { getWidgetContext } from '../stores/widget.svelte';
  import { ENGAGEMENT_CATEGORIES, type EngagementCategory } from '../types';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const widgetState = getWidgetContext();

  type FilterOption = EngagementCategory | 'all';

  const filters: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All Games' },
    ...Object.entries(ENGAGEMENT_CATEGORIES).map(([key, meta]) => ({
      value: key as EngagementCategory,
      label: meta.label
    }))
  ];

  function setFilter(filter: FilterOption) {
    if (disabled) return;
    widgetState.activeFilter = filter;
  }
</script>

<nav class="filter-bar" class:disabled aria-label="Filter games by category">
  {#each filters as filter (filter.value)}
    <button
      class="filter-btn"
      class:active={widgetState.activeFilter === filter.value}
      onclick={() => setFilter(filter.value)}
      aria-pressed={widgetState.activeFilter === filter.value}
      {disabled}
    >
      {filter.label}
    </button>
  {/each}
</nav>

<style>
  .filter-bar {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-weight: 600;
    background: transparent;
    border: 2px solid var(--color-border);
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .filter-btn:hover {
    border-color: var(--color-text);
    color: var(--color-text);
  }

  .filter-btn.active {
    background: var(--color-text);
    border-color: var(--color-text);
    color: var(--color-surface);
  }

  .filter-bar.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .filter-btn:disabled {
    cursor: not-allowed;
  }
</style>
