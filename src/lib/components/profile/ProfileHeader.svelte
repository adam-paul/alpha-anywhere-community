<script lang="ts">
  import { Avatar, Button, Icon } from '$lib/components/ui';
  import { getPresenceStore } from '$lib/stores/presence.svelte';
  import type { FriendshipStatus, ProfileStudent } from '$lib/types';

  interface Props {
    student: ProfileStudent;
    userId: string;
    friendshipStatus: FriendshipStatus;
    isEditing?: boolean;
    onEdit?: () => void;
    onFriendAction?: (action: 'request' | 'accept' | 'remove', friendshipId?: string) => void;
  }

  let {
    student,
    userId,
    friendshipStatus,
    isEditing = false,
    onEdit,
    onFriendAction
  }: Props = $props();

  const presence = getPresenceStore();
</script>

<div class="profile-header">
  <div class="cover-image" style:background-image="url({student.coverUrl})">
    <div class="cover-fallback"></div>
  </div>

  <div class="profile-info">
    <div class="avatar-wrapper">
      <Avatar
        src={student.avatarUrl}
        alt={student.displayName}
        size="lg"
        fallback={student.displayName.charAt(0)}
        online={presence.isOnline(userId)}
      />
    </div>

    <div class="info-content">
      <div class="name-row">
        <div class="name-section">
          <h1 class="display-name">{student.displayName}</h1>
          <span class="handle">@{student.handle}</span>
        </div>
        <div class="actions">
          {#if friendshipStatus.kind === 'self'}
            {#if !isEditing}
              <Button variant="secondary" size="sm" onclick={onEdit}>Edit Profile</Button>
            {/if}
          {:else if friendshipStatus.kind === 'none'}
            <Button variant="primary" size="sm" onclick={() => onFriendAction?.('request')}>
              Add Friend
            </Button>
          {:else if friendshipStatus.kind === 'pending-sent'}
            <div class="pending-sent-wrap">
              <Button
                variant="secondary"
                size="sm"
                onclick={() => onFriendAction?.('remove', friendshipStatus.friendshipId)}
              >
                {#snippet sizeFrom()}Request Sent{/snippet}
                <span class="pending-label">Request Sent</span>
                <span class="cancel-label"><Icon name="x" size={14} /> Cancel</span>
              </Button>
            </div>
          {:else if friendshipStatus.kind === 'pending-received'}
            <Button
              variant="primary"
              size="sm"
              onclick={() => onFriendAction?.('accept', friendshipStatus.friendshipId)}
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onclick={() => onFriendAction?.('remove', friendshipStatus.friendshipId)}
            >
              Decline
            </Button>
          {:else if friendshipStatus.kind === 'friends'}
            <Button
              variant="secondary"
              size="sm"
              onclick={() => onFriendAction?.('remove', friendshipStatus.friendshipId)}
            >
              Unfriend
            </Button>
          {/if}
        </div>
      </div>

      <div class="meta-row">
        <span class="location">{student.location}</span>
        <span class="separator">-</span>
        <span class="joined">Student since {student.joinedDate}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-header {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    overflow: hidden;
    margin-bottom: var(--space-6);
  }

  .cover-image {
    height: 160px;
    background-size: cover;
    background-position: center;
    background-color: var(--color-primary);
    position: relative;
  }

  .cover-fallback {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-ice-breaker) 100%);
    opacity: 0.8;
  }

  .profile-info {
    padding: var(--space-4) var(--space-6);
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    margin-top: calc(-1 * var(--avatar-size-md));
    position: relative;
  }

  .avatar-wrapper {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-1);
    background: var(--color-fill);
    border-radius: 50%;
    border: var(--border-width) solid var(--color-border);
  }

  .avatar-wrapper :global(.avatar) {
    width: var(--avatar-size-xl);
    height: var(--avatar-size-xl);
    font-size: var(--font-size-xl);
  }

  .info-content {
    flex: 1;
    padding-top: 44px;
  }

  .name-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
  }

  .name-section {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .display-name {
    font-size: var(--font-size-xl);
    font-weight: 800;
    margin: 0;
  }

  .handle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .separator {
    color: var(--color-border);
  }

  .pending-sent-wrap .cancel-label {
    display: none;
    align-items: center;
    gap: var(--space-1);
  }

  .pending-sent-wrap:hover .pending-label {
    display: none;
  }

  .pending-sent-wrap:hover .cancel-label {
    display: inline-flex;
  }

  .pending-sent-wrap:hover :global(.btn) {
    border-color: var(--color-border);
    color: var(--color-error);
  }
</style>
