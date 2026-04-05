<script lang="ts">
  import { goto } from '$app/navigation';
  import { Avatar, IconButton } from '$lib/components/ui';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import type { Notification } from '$lib/types';

  interface Props {
    notification: Notification;
  }

  let { notification }: Props = $props();

  const store = getNotificationStore();

  let acting = $state(false);

  const message = $derived.by(() => {
    const name = notification.actorDisplayName;
    switch (notification.type) {
      case 'friend_request_received':
        return `${name} sent you a friend request`;
      case 'friend_request_accepted':
        return `${name} accepted your friend request`;
      case 'conversation_created':
        return `${name} started a conversation with you`;
    }
  });

  const href = $derived.by(() => {
    switch (notification.type) {
      case 'friend_request_received':
        return '/profile/me';
      case 'friend_request_accepted':
        return `/profile/${notification.actorId}`;
      case 'conversation_created':
        return '/chat';
    }
  });

  const timeAgo = $derived.by(() => {
    const now = Date.now();
    const created = new Date(notification.createdAt + 'Z').getTime();
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  });

  async function handleClick() {
    if (!notification.read) {
      await store.markAsRead(notification.id);
    }
    store.close();
    goto(href);
  }

  async function handleAccept() {
    if (acting || !notification.referenceId) return;
    acting = true;
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: notification.referenceId })
      });
      if (!res.ok) throw new Error();
      // Notify the original requester that their request was accepted
      store.sendPush(notification.actorId);
      await store.markAsRead(notification.id);
    } catch {
      // Request may have already been handled elsewhere — mark as read anyway
      await store.markAsRead(notification.id);
    }
    acting = false;
  }

  async function handleDecline() {
    if (acting || !notification.referenceId) return;
    acting = true;
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: notification.referenceId })
      });
      if (!res.ok) throw new Error();
      await store.markAsRead(notification.id);
    } catch {
      await store.markAsRead(notification.id);
    }
    acting = false;
  }
</script>

<button class="notification-item" class:unread={!notification.read} onclick={handleClick}>
  <Avatar
    src={notification.actorAvatarUrl ?? undefined}
    alt={notification.actorDisplayName}
    size="sm"
    fallback={notification.actorDisplayName.charAt(0)}
  />
  <div class="notification-content">
    <p class="notification-message">{message}</p>
    <span class="notification-time">{timeAgo}</span>
  </div>
  {#if notification.type === 'friend_request_received' && !notification.read}
    <div
      class="notification-actions"
      role="toolbar"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <IconButton
        icon="check"
        shape="circle"
        size="sm"
        label="Accept friend request"
        disabled={acting}
        onclick={handleAccept}
      />
      <IconButton
        icon="x"
        shape="circle"
        size="sm"
        label="Decline friend request"
        disabled={acting}
        onclick={handleDecline}
      />
    </div>
  {/if}
</button>

<style>
  .notification-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast);
  }

  .notification-item:hover {
    background: var(--color-bg);
  }

  .notification-item.unread {
    background: var(--color-primary-alpha);
  }

  .notification-item.unread:hover {
    background: var(--color-bg);
  }

  .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-message {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.4;
  }

  .notification-time {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .notification-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }
</style>
