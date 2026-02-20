<script lang="ts">
  import { getExploreStore } from '$lib/stores/explore.svelte';
  import Placeholder from '$lib/components/Placeholder.svelte';
  import StudentCard from './StudentCard.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  const explore = getExploreStore();
</script>

<div class="student-grid">
  {#each explore.filteredStudents as student (student.id)}
    <StudentCard {student} {disabled} />
  {:else}
    <Placeholder size="sm" title="No students found matching your criteria." />
  {/each}
</div>

<style>
  .student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }

  .student-grid :global(.placeholder) {
    grid-column: 1 / -1;
  }
</style>
