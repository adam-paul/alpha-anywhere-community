/**
 * Notification store — manages notification state, real-time delivery, and tray UI.
 *
 * Scope: bell-tray notifications only (friend requests, voice calls, etc.).
 * Chat unread state lives on the chat store (derived from per-conversation
 * `unreadCount`); this store no longer participates in that concern.
 *
 * `unreadCount` is derived from `notifications.filter(n => !n.read).length`
 * — one source of truth. The array is bounded by the server load limit
 * (currently 20), so the derived count saturates there; the AppHeader
 * badge renders "20+" at the cap.
 */

import { getContext, setContext } from 'svelte';
import type { Notification, NotificationStore, RealtimeStore } from '$lib/types';

const NOTIFICATION_CONTEXT_KEY = 'notifications';

export function createNotificationStore(
  initial: Notification[],
  realtime: RealtimeStore,
  currentUserId: string
): NotificationStore {
  let notifications = $state<Notification[]>(initial);
  let isOpen = $state(false);

  const unreadCount = $derived(notifications.filter((n) => !n.read).length);

  function open() {
    isOpen = true;
  }

  function close() {
    isOpen = false;
  }

  function toggle() {
    isOpen = !isOpen;
  }

  async function markAsRead(notificationId: string): Promise<void> {
    const prev = notifications.map((n) => ({ ...n }));

    // Optimistic update
    notifications = notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    } catch {
      notifications = prev;
    }
  }

  async function markAllAsRead(): Promise<void> {
    const prev = notifications.map((n) => ({ ...n }));

    // Optimistic update
    notifications = notifications.map((n) => ({ ...n, read: true }));

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    } catch {
      notifications = prev;
    }
  }

  async function refresh(): Promise<void> {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      notifications = data.notifications;
    } catch {
      // Silently fail — stale data is better than no data
    }
  }

  function sendPush(recipientId: string): void {
    realtime.send({ type: 'notification:push', recipientId });
  }

  // Listen for real-time signals on presence:global
  realtime.onMessage((message) => {
    const recipientId =
      'recipientId' in message ? (message as { recipientId: string }).recipientId : null;
    if (recipientId !== currentUserId) return;

    if (message.type === 'notification:push') {
      refresh();
    }
  });

  const store: NotificationStore = {
    get notifications() {
      return notifications;
    },
    get unreadCount() {
      return unreadCount;
    },
    get isOpen() {
      return isOpen;
    },
    open,
    close,
    toggle,
    markAsRead,
    markAllAsRead,
    refresh,
    sendPush
  };

  setContext(NOTIFICATION_CONTEXT_KEY, store);
  return store;
}

export function getNotificationStore(): NotificationStore {
  const store = getContext<NotificationStore>(NOTIFICATION_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Notification store not found. Ensure createNotificationStore() is called in a parent component.'
    );
  }
  return store;
}
