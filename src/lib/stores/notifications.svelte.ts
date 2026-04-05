/**
 * Notification store — manages notification state, real-time delivery, and tray UI.
 *
 * Also tracks chat unread count for the sidebar badge, since both
 * piggyback on the same presence:global WebSocket channel.
 *
 * Subscribes to the realtime store's message stream on presence:global
 * and listens for notification:push and chat:unread signals.
 */

import { getContext, setContext } from 'svelte';
import type { Notification, NotificationStore, RealtimeStore } from '$lib/types';

const NOTIFICATION_CONTEXT_KEY = 'notifications';

export function createNotificationStore(
  initial: Notification[],
  initialUnreadCount: number,
  initialChatUnreadCount: number,
  realtime: RealtimeStore,
  currentUserId: string
): NotificationStore {
  let notifications = $state<Notification[]>(initial);
  let unreadCount = $state(initialUnreadCount);
  let chatUnreadCount = $state(initialChatUnreadCount);
  let isOpen = $state(false);

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
    const prevCount = unreadCount;

    // Optimistic update
    notifications = notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    unreadCount = Math.max(0, unreadCount - 1);

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    } catch {
      // Rollback
      notifications = prev;
      unreadCount = prevCount;
    }
  }

  async function markAllAsRead(): Promise<void> {
    const prev = notifications.map((n) => ({ ...n }));
    const prevCount = unreadCount;

    // Optimistic update
    notifications = notifications.map((n) => ({ ...n, read: true }));
    unreadCount = 0;

    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    } catch {
      // Rollback
      notifications = prev;
      unreadCount = prevCount;
    }
  }

  async function refresh(): Promise<void> {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      notifications = data.notifications;
      unreadCount = data.unreadCount;
    } catch {
      // Silently fail — stale data is better than no data
    }
  }

  function sendPush(recipientId: string): void {
    realtime.send({ type: 'notification:push', recipientId });
  }

  function sendChatUnread(recipientId: string): void {
    realtime.send({ type: 'chat:unread', recipientId });
  }

  function decrementChatUnread(n: number): void {
    chatUnreadCount = Math.max(0, chatUnreadCount - n);
  }

  // Listen for real-time signals on presence:global
  realtime.onMessage((message) => {
    const recipientId =
      'recipientId' in message ? (message as { recipientId: string }).recipientId : null;
    if (recipientId !== currentUserId) return;

    if (message.type === 'notification:push') {
      refresh();
    } else if (message.type === 'chat:unread') {
      chatUnreadCount++;
    }
  });

  const store: NotificationStore = {
    get notifications() {
      return notifications;
    },
    get unreadCount() {
      return unreadCount;
    },
    get chatUnreadCount() {
      return chatUnreadCount;
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
    sendPush,
    sendChatUnread,
    decrementChatUnread
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
