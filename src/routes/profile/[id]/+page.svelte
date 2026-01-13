<script lang="ts">
  import { page } from '$app/stores';
  import { MOCK_STUDENTS } from '$lib/mock-data';
  import { InterestBadge } from '$lib/components/ui';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import MutualFriends from '$lib/components/MutualFriends.svelte';
  import Placeholder from '$lib/components/Placeholder.svelte';

  // Find student by route param ID
  const student = $derived(
    MOCK_STUDENTS.find(s => s.id === $page.params.id)
  );

  // Resolve mutual friends from IDs
  const mutualFriends = $derived(
    student
      ? student.mutualFriendIds
          .map(id => MOCK_STUDENTS.find(s => s.id === id))
          .filter((s): s is typeof MOCK_STUDENTS[0] => s !== undefined)
      : []
  );

  // Format stats for display
  const dailyGoalText = $derived(
    student
      ? `${student.stats.dailyXpCurrent} / ${student.stats.dailyXpGoal} XP`
      : ''
  );
</script>

<svelte:head>
  <title>{student ? `${student.displayName} - Profile` : 'Profile'} - Alpha Anywhere Community</title>
</svelte:head>

{#if student}
  <ProfileHeader {student} />

  <div class="profile-content">
    <section class="profile-section">
      <h3 class="section-title">About Me</h3>
      <p class="about-text">{student.bio}</p>
    </section>

    <section class="profile-section">
      <h3 class="section-title">Interests</h3>
      <div class="interests-list">
        {#each student.interests as interest (interest)}
          <InterestBadge {interest} />
        {/each}
      </div>
    </section>

    <section class="profile-section">
      <h3 class="section-title">Statistics</h3>
      <div class="stats-grid">
        <StatCard label="XP Earned" value={student.stats.xpEarned} icon="⚡" />
        <StatCard label="Timeback" value="{student.stats.timebackHours} hrs" icon="⏱️" />
        <StatCard label="Daily XP Goal" value={dailyGoalText} icon="🎯" />
      </div>
    </section>

    {#if mutualFriends.length > 0}
      <section class="profile-section">
        <h3 class="section-title">Mutual Friends</h3>
        <MutualFriends friends={mutualFriends} />
      </section>
    {/if}
  </div>
{:else}
  <Placeholder
    title="Student Not Found"
    description="This student profile doesn't exist or has been removed."
    icon="user"
  />
{/if}

<style>
  .profile-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .profile-section {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--space-5);
  }

  .section-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    margin: 0 0 var(--space-4) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .about-text {
    margin: 0;
    line-height: 1.6;
    color: var(--color-text);
  }

  .interests-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
  }
</style>
