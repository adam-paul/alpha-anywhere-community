<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { Avatar, Button, IconButton, Input, Textarea, ToggleButton } from '$lib/components/ui';
  import InterestBadge from '$lib/components/InterestBadge.svelte';
  import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
  import LinkedAccounts from '$lib/components/profile/LinkedAccounts.svelte';
  import RobloxLinkModal from '$lib/components/arcade/RobloxLinkModal.svelte';
  import { INTERESTS } from '$lib/constants';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import { getUserStore } from '$lib/stores/user.svelte';
  import type { EditMode, Interest, LinkablePlatform } from '$lib/types';
  import type { PageData } from './$types';

  const notificationStore = getUserStore().user ? getNotificationStore() : null;

  let { data }: { data: PageData } = $props();

  // Edit mode state
  let editMode = $state<EditMode>('view');

  // Editable fields (initialized from server data, then edited locally)
  // svelte-ignore state_referenced_locally
  let editBio = $state(data.profile.bio ?? '');
  // svelte-ignore state_referenced_locally
  let editLocation = $state(data.profile.location ?? '');
  // svelte-ignore state_referenced_locally
  let editInterests = $state<Interest[]>([...data.profile.interests]);

  // Moderation rejection surface — cleared when the offending field is edited.
  let saveError = $state<{ field: 'bio' | 'location'; message: string } | null>(null);

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

  // Friends section (own profile: friends, other profile: mutual friends)
  const friendsLabel = $derived(data.isOwnProfile ? 'Friends' : 'Mutual Friends');
  const friendsList = $derived(data.isOwnProfile ? data.friends : data.mutualFriends);
  const friendsEmptyMessage = $derived(
    data.isOwnProfile ? "You haven't added any friends yet." : 'No mutual friends yet.'
  );

  // All available interests for the picker
  const allInterests = Object.keys(INTERESTS) as Interest[];

  function startEditing() {
    editBio = data.profile.bio ?? '';
    editLocation = data.profile.location ?? '';
    editInterests = [...data.profile.interests];
    editMode = 'editing';
  }

  function cancelEditing() {
    editMode = 'view';
  }

  function toggleInterest(interest: Interest) {
    if (editInterests.includes(interest)) {
      editInterests = editInterests.filter((i) => i !== interest);
    } else {
      editInterests = [...editInterests, interest];
    }
  }

  async function saveProfile() {
    editMode = 'saving';
    saveError = null;
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
        const body = await response.json().catch(() => null);
        if (
          body?.error === 'moderation_rejected' &&
          (body.field === 'bio' || body.field === 'location')
        ) {
          saveError = { field: body.field, message: String(body.message ?? '') };
          editMode = 'editing';
          return;
        }
        if (body?.error === 'moderation_unavailable') {
          saveError = {
            field: body.field === 'location' ? 'location' : 'bio',
            message: String(body.message ?? 'Moderation is temporarily unavailable.')
          };
          editMode = 'editing';
          return;
        }
        throw new Error('Failed to save profile');
      }

      // Refresh page data from server
      await invalidateAll();
      editMode = 'view';
    } catch (error) {
      console.error('Failed to save profile:', error);
      editMode = 'editing';
    }
  }

  async function handleFriendAction(
    action: 'request' | 'accept' | 'remove',
    friendshipId?: string
  ) {
    try {
      let url: string;
      let body: Record<string, string>;

      switch (action) {
        case 'request':
          url = '/api/friends/request';
          body = { addresseeId: data.user.id };
          break;
        case 'accept':
          url = '/api/friends/accept';
          body = { friendshipId: friendshipId! };
          break;
        case 'remove':
          url = '/api/friends/remove';
          body = { friendshipId: friendshipId! };
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} friend`);
      }

      // Push real-time notification signal to the other user
      if (notificationStore) {
        if (action === 'request') {
          notificationStore.sendPush(data.user.id);
        } else if (action === 'accept') {
          const result = await response.json();
          if (result.friendship?.requester_id) {
            notificationStore.sendPush(result.friendship.requester_id);
          }
        }
      }

      await invalidateAll();
    } catch (error) {
      console.error(`Friend action failed:`, error);
    }
  }

  // Linked Accounts — link is a modal flow (RobloxLinkModal self-invalidates on
  // success); unlink is a direct fetch. Only Roblox is wired up today.
  let linkModalPlatform = $state<LinkablePlatform | null>(null);

  function handleLinkAccount(platform: LinkablePlatform) {
    if (platform === 'roblox') linkModalPlatform = 'roblox';
  }

  async function handleUnlinkAccount(platform: LinkablePlatform) {
    if (platform !== 'roblox') return;
    try {
      const response = await fetch('/api/arcade/roblox/unlink', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to unlink');
      await invalidateAll();
    } catch (error) {
      console.error('Roblox unlink failed:', error);
    }
  }
</script>

<svelte:head>
  <title>{data.user.displayName} - Profile - Alpha Anywhere Community</title>
</svelte:head>

<ProfileHeader
  {student}
  userId={data.user.id}
  friendshipState={data.friendshipState}
  isEditing={editMode !== 'view'}
  onEdit={startEditing}
  onFriendAction={handleFriendAction}
/>

{#if editMode !== 'view'}
  <!-- Edit Mode -->
  <div class="profile-content">
    <section class="profile-section">
      <h3 class="section-title">About Me</h3>
      <Textarea
        value={editBio}
        placeholder="Tell others about yourself..."
        rows={4}
        oninput={(e) => {
          editBio = (e.target as HTMLTextAreaElement).value;
          if (saveError?.field === 'bio') saveError = null;
        }}
      />
      {#if saveError?.field === 'bio'}
        <p class="field-error" role="alert">{saveError.message}</p>
      {/if}
    </section>

    <section class="profile-section">
      <h3 class="section-title">Location</h3>
      <Input
        value={editLocation}
        placeholder="City, State (e.g., Austin, TX)"
        oninput={(e) => {
          editLocation = (e.target as HTMLInputElement).value;
          if (saveError?.field === 'location') saveError = null;
        }}
      />
      {#if saveError?.field === 'location'}
        <p class="field-error" role="alert">{saveError.message}</p>
      {/if}
    </section>

    <section class="profile-section">
      <h3 class="section-title">Interests</h3>
      <p class="section-hint">Select the interests that describe you</p>
      <div class="interests-picker">
        {#each allInterests as interest (interest)}
          <ToggleButton
            active={editInterests.includes(interest)}
            onclick={() => toggleInterest(interest)}
            variant="outline"
            size="sm"
          >
            {INTERESTS[interest].label}
          </ToggleButton>
        {/each}
      </div>
    </section>

    <div class="edit-actions">
      <Button variant="secondary" onclick={cancelEditing} disabled={editMode === 'saving'}
        >Cancel</Button
      >
      <Button variant="primary" onclick={saveProfile} disabled={editMode === 'saving'}>
        {editMode === 'saving' ? 'Saving...' : 'Save Profile'}
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

    {#if data.isOwnProfile || data.linkedAccounts.roblox}
      <section class="profile-section">
        <h3 class="section-title">Linked Accounts</h3>
        <LinkedAccounts
          isOwnProfile={data.isOwnProfile}
          linkedAccounts={data.linkedAccounts}
          onlink={handleLinkAccount}
          onunlink={handleUnlinkAccount}
        />
      </section>
    {/if}

    <section class="profile-section">
      <h3 class="section-title">{friendsLabel} ({friendsList.length})</h3>

      <div
        class="friends-columns"
        class:has-requests={data.isOwnProfile && data.pendingRequests.length > 0}
      >
        <div class="friends-column">
          {#if friendsList.length === 0}
            <p class="about-text empty">{friendsEmptyMessage}</p>
          {:else}
            <div class="friends-list">
              {#each friendsList as friend (friend.id)}
                <a href="/profile/{friend.id}" class="friend-item">
                  <Avatar
                    src={friend.avatarUrl ?? undefined}
                    alt={friend.displayName}
                    size="sm"
                    fallback={friend.displayName.charAt(0)}
                  />
                  <span class="friend-name">{friend.displayName}</span>
                </a>
              {/each}
            </div>
          {/if}
        </div>

        {#if data.isOwnProfile && data.pendingRequests.length > 0}
          <div class="requests-column">
            <h4 class="subsection-title">Pending Requests ({data.pendingRequests.length})</h4>
            <div class="friend-requests-list">
              {#each data.pendingRequests as request (request.friendshipId)}
                <div class="friend-request-item">
                  <a href="/profile/{request.id}" class="friend-item">
                    <Avatar
                      src={request.avatarUrl ?? undefined}
                      alt={request.displayName}
                      size="sm"
                      fallback={request.displayName.charAt(0)}
                    />
                    <span class="friend-name">{request.displayName}</span>
                  </a>
                  <div class="friend-request-actions">
                    <span class="action-accept">
                      <IconButton
                        icon="check"
                        shape="square"
                        size="sm"
                        label="Accept friend request from {request.displayName}"
                        onclick={() => handleFriendAction('accept', request.friendshipId)}
                      />
                    </span>
                    <span class="action-decline">
                      <IconButton
                        icon="x"
                        shape="square"
                        size="sm"
                        label="Decline friend request from {request.displayName}"
                        onclick={() => handleFriendAction('remove', request.friendshipId)}
                      />
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  </div>
{/if}

<RobloxLinkModal
  open={linkModalPlatform === 'roblox'}
  onclose={() => (linkModalPlatform = null)}
  onlinked={() => (linkModalPlatform = null)}
/>

<style>
  .profile-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .profile-section {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    padding: var(--space-5);
  }

  .section-title {
    font-size: var(--font-size-base);
    font-weight: 700;
    margin: 0 0 var(--space-4) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-error {
    margin: var(--space-2) 0 0 0;
    font-size: var(--font-size-sm);
    color: var(--color-danger, #b91c1c);
    line-height: 1.4;
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

  .friends-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .friend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    text-decoration: none;
    color: inherit;
    transition: background var(--transition-fast);
  }

  .friend-item:hover {
    background: var(--color-bg);
  }

  .friend-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .about-text.empty {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .friends-columns {
    display: block;
  }

  .friends-columns.has-requests {
    display: flex;
    gap: 0;
  }

  .friends-column {
    flex: 1;
    min-width: 0;
  }

  .friends-columns.has-requests .friends-column {
    /* Align cards with the right column by matching the subsection title height */
    padding-top: calc(var(--font-size-sm) * 1.5 + var(--space-3));
    padding-right: var(--space-5);
  }

  .requests-column {
    flex: 1;
    min-width: 0;
    padding-left: var(--space-5);
    border-left: 1px solid var(--color-border);
  }

  .subsection-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-3) 0;
  }

  .friend-requests-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .friend-request-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .friend-request-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .action-accept :global(.icon-btn) {
    color: var(--color-positive);
  }

  .action-accept :global(.icon-btn:hover) {
    background: var(--color-positive);
    border-color: var(--color-positive);
    color: var(--color-surface);
  }

  .action-decline :global(.icon-btn) {
    color: var(--color-error);
  }

  .action-decline :global(.icon-btn:hover) {
    background: var(--color-error);
    border-color: var(--color-error);
    color: var(--color-surface);
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

  .interests-picker :global(.toggle-btn) {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
  }
</style>
