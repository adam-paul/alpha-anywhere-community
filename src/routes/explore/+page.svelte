<script lang="ts">
  import { PageHeader } from '$lib/components/layout';
  import { Select } from '$lib/components/ui';
  import { createExploreStore } from '$lib/stores/explore.svelte';
  import { INTERESTS, type Interest } from '$lib/types';
  import StudentGrid from '$lib/components/StudentGrid.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import ViewToggle from '$lib/components/ViewToggle.svelte';
  import Placeholder from '$lib/components/Placeholder.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Create explore store with server data (provides context to child components)
  const explore = createExploreStore(data.students);

  // Build interest filter options from INTERESTS metadata
  const interestOptions = [
    { value: 'all', label: 'All Interests' },
    ...Object.entries(INTERESTS).map(([key, meta]) => ({
      value: key,
      label: meta.label
    }))
  ];

  function handleInterestChange(value: string) {
    explore.activeInterestFilter = value as Interest | 'all';
  }
</script>

<svelte:head>
  <title>Explore - Alpha Anywhere Community</title>
</svelte:head>

<PageHeader title="Explore">
  {#snippet actions()}
    <ViewToggle bind:mode={explore.viewMode} />
  {/snippet}
</PageHeader>

<div class="explore-toolbar">
  <SearchBar
    bind:value={explore.searchQuery}
    placeholder="Search by name, interests or skills"
  />
  <Select
    options={interestOptions}
    value={explore.activeInterestFilter}
    onchange={handleInterestChange}
  />
</div>

{#if explore.viewMode === 'grid'}
  <StudentGrid />
{:else}
  <Placeholder
    title="Map View"
    description="Geographic student discovery coming soon."
    icon="search"
  />
{/if}

<style>
  .explore-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
  }
</style>
