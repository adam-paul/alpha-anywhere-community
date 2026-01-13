<script lang="ts">
  import { getExploreStore } from '$lib/stores/explore.svelte';
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
    <div class="empty-state">
      <p>No students found matching your criteria.</p>
    </div>
  {/each}
</div>

<style>
  .student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-base);
  }
</style>
