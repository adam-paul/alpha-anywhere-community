<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { Button, Badge, InterestBadge } from '$lib/components/ui';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import { INTERESTS } from '$lib/constants';
  import type { Interest } from '$lib/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Edit mode state
  let isEditing = $state(false);
  let isSaving = $state(false);

  // Editable fields (initialized from server data, then edited locally)
  // svelte-ignore state_referenced_locally
  let editBio = $state(data.profile.bio ?? '');
  // svelte-ignore state_referenced_locally
  let editLocation = $state(data.profile.location ?? '');
  // svelte-ignore state_referenced_locally
  let editInterests = $state<Interest[]>([...data.profile.interests]);

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

  // All available interests for the picker
  const allInterests = Object.keys(INTERESTS) as Interest[];

  function startEditing() {
    editBio = data.profile.bio ?? '';
    editLocation = data.profile.location ?? '';
    editInterests = [...data.profile.interests];
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
  }

  function toggleInterest(interest: Interest) {
    if (editInterests.includes(interest)) {
      editInterests = editInterests.filter((i) => i !== interest);
    } else {
      editInterests = [...editInterests, interest];
    }
  }

  async function saveProfile() {
    isSaving = true;
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: editBio || null,
          location: editLocation || null,
          interests: editInterests
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Refresh page data from server
      await invalidateAll();
      isEditing = false;
    } catch (error) {
      console.error('Failed to save profile:', error);
      // TODO: Show error toast
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head>
  <title>{data.user.displayName} - Profile - Alpha Anywhere Community</title>
</svelte:head>

<ProfileHeader {student} isOwnProfile={data.isOwnProfile} {isEditing} onEdit={startEditing} />

{#if isEditing}
  <!-- Edit Mode -->
  <div class="profile-content">
    <section class="profile-section">
      <h3 class="section-title">About Me</h3>
      <textarea
        class="edit-textarea"
        bind:value={editBio}
        placeholder="Tell others about yourself..."
        rows="4"
      ></textarea>
    </section>

    <section class="profile-section">
      <h3 class="section-title">Location</h3>
      <input
        type="text"
        class="edit-input"
        bind:value={editLocation}
        placeholder="City, State (e.g., Austin, TX)"
      />
    </section>

    <section class="profile-section">
      <h3 class="section-title">Interests</h3>
      <p class="section-hint">Select the interests that describe you</p>
      <div class="interests-picker">
        {#each allInterests as interest (interest)}
          <button
            type="button"
            class="interest-option"
            class:selected={editInterests.includes(interest)}
            onclick={() => toggleInterest(interest)}
          >
            {INTERESTS[interest].label}
          </button>
        {/each}
      </div>
    </section>

    <div class="edit-actions">
      <Button variant="secondary" onclick={cancelEditing} disabled={isSaving}>Cancel</Button>
      <Button variant="primary" onclick={saveProfile} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  </div>
{:else}
  <!-- View Mode -->
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

  .about-text.empty {
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Edit mode styles */
  .edit-input,
  .edit-textarea {
    width: 100%;
    padding: var(--space-3);
    font-family: inherit;
    font-size: var(--font-size-base);
    color: var(--color-text);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    resize: vertical;
  }

  .edit-input:focus,
  .edit-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .section-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-3) 0;
  }

  .interests-picker {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .interest-option {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    background: transparent;
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .interest-option:hover {
    border-color: var(--color-text-muted);
  }

  .interest-option.selected {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: var(--color-bg);
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
  }
</style>
