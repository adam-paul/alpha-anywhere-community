<script lang="ts">
  import { InterestBadge } from '$lib/components/ui';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import Placeholder from '$lib/components/Placeholder.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Format joined date from ISO string
  const joinedDate = $derived(
    new Date(data.user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  );

  // Build student object for ProfileHeader (adapts server data to component's expected shape)
  const student = $derived({
    id: data.user.id,
    displayName: data.user.displayName,
    handle: data.user.displayName.toLowerCase().replace(/\s+/g, '_'),
    avatarUrl: data.profile.avatarUrl ?? undefined,
    coverUrl: data.profile.coverUrl ?? undefined,
    location: data.profile.location ?? 'Location not set',
    bio: data.profile.bio ?? '',
    interests: data.profile.interests,
    joinedDate
  });
</script>

<svelte:head>
  <title>{data.user.displayName} - Profile - Alpha Anywhere Community</title>
</svelte:head>

<ProfileHeader {student} isOwnProfile={data.isOwnProfile} />

<div class="profile-content">
  <section class="profile-section">
    <h3 class="section-title">About Me</h3>
    {#if student.bio}
      <p class="about-text">{student.bio}</p>
    {:else}
      <p class="about-text empty">
        {#if data.isOwnProfile}
          You haven't added a bio yet.
        {:else}
          This user hasn't added a bio yet.
        {/if}
      </p>
    {/if}
  </section>

  <section class="profile-section">
    <h3 class="section-title">Interests</h3>
    {#if student.interests.length > 0}
      <div class="interests-list">
        {#each student.interests as interest (interest)}
          <InterestBadge {interest} />
        {/each}
      </div>
    {:else}
      <p class="about-text empty">
        {#if data.isOwnProfile}
          You haven't added any interests yet.
        {:else}
          This user hasn't added any interests yet.
        {/if}
      </p>
    {/if}
  </section>
</div>

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

  .about-text.empty {
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
