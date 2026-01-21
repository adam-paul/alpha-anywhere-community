<script lang="ts">
  import { Avatar, Button } from './ui';

  interface ProfileStudent {
    displayName: string;
    handle: string;
    avatarUrl?: string;
    coverUrl?: string;
    location: string;
    joinedDate: string;
  }

  interface Props {
    student: ProfileStudent;
    isOwnProfile?: boolean;
  }

  let { student, isOwnProfile = false }: Props = $props();
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
      />
    </div>

    <div class="info-content">
      <div class="name-row">
        <div class="name-section">
          <h1 class="display-name">{student.displayName}</h1>
          <span class="handle">@{student.handle}</span>
        </div>
        {#if isOwnProfile}
          <Button variant="secondary" size="sm" disabled>Edit Profile</Button>
        {:else}
          <Button variant="primary" size="sm">Send Friend Request</Button>
        {/if}
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
    border-radius: var(--radius);
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
    margin-top: -40px;
    position: relative;
  }

  .avatar-wrapper {
    flex-shrink: 0;
    padding: 4px;
    background: var(--color-surface);
    border-radius: 50%;
    border: var(--border-width) solid var(--color-border);
  }

  .avatar-wrapper :global(.avatar) {
    width: 80px;
    height: 80px;
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
</style>
