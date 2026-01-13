<script lang="ts">
  import type { Student } from '$lib/types';
  import { Card, Avatar, InterestBadge } from './ui';

  interface Props {
    student: Student;
    disabled?: boolean;
  }

  let { student, disabled = false }: Props = $props();

  // Show max 4 interests, with overflow indicator
  const displayInterests = $derived(student.interests.slice(0, 4));
  const overflowCount = $derived(Math.max(0, student.interests.length - 4));
</script>

<a href="/profile/{student.id}" class="student-card-link" class:disabled>
  <Card interactive {disabled}>
    <div class="card-content">
      <div class="card-header">
        <Avatar
          src={student.avatarUrl}
          alt={student.displayName}
          size="md"
          fallback={student.displayName.charAt(0)}
        />
        <div class="header-info">
          <h3 class="student-name">{student.displayName}</h3>
          <span class="student-location">{student.location}</span>
        </div>
      </div>

      <p class="student-bio">{student.bio}</p>

      <div class="interests">
        {#each displayInterests as interest (interest)}
          <InterestBadge {interest} />
        {/each}
        {#if overflowCount > 0}
          <span class="overflow-count">+{overflowCount}</span>
        {/if}
      </div>
    </div>
  </Card>
</a>

<style>
  .student-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .student-card-link.disabled {
    pointer-events: none;
  }

  .card-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .student-name {
    font-size: var(--font-size-base);
    font-weight: 700;
    margin: 0;
    line-height: 1.3;
  }

  .student-location {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .student-bio {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .interests {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  .overflow-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-weight: 500;
  }
</style>
