<script lang="ts">
  import { getArcadeStore } from '../stores/arcade.svelte';
  import { ENGAGEMENT_CATEGORIES, type EngagementCategory } from '../types';
  import { ToggleButton } from './ui';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const arcade = getArcadeStore();

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
    arcade.activeFilter = filter;
  }
</script>

<nav class="filter-bar" class:disabled aria-label="Filter games by category">
  {#each filters as filter (filter.value)}
    <ToggleButton
      active={arcade.activeFilter === filter.value}
      {disabled}
      onclick={() => setFilter(filter.value)}
    >
      {filter.label}
    </ToggleButton>
  {/each}
</nav>

<style>
  .filter-bar {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .filter-bar.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
