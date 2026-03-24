/**
 * Presence store — tracks which users are currently online.
 *
 * Subscribes to the realtime store's message stream and maintains
 * a map of online users from presence:snapshot, system:join, and
 * system:leave events.
 */

import { getContext, setContext } from 'svelte';
import type { PresenceStore, PresenceUser, RealtimeStore } from '$lib/types';

const PRESENCE_CONTEXT_KEY = 'presence';

export function createPresenceStore(realtime: RealtimeStore): PresenceStore {
  let onlineUsers = $state(new Map<string, PresenceUser>());

  const onlineCount = $derived(onlineUsers.size);

  realtime.onMessage((message) => {
    if (message.type === 'presence:snapshot') {
      const next = new Map<string, PresenceUser>();
      for (const user of message.users) {
        next.set(user.userId, user);
      }
      onlineUsers = next;
    } else if (message.type === 'system:join') {
      const next = new Map(onlineUsers);
      next.set(message.userId, { userId: message.userId, displayName: message.displayName });
      onlineUsers = next;
    } else if (message.type === 'system:leave') {
      const next = new Map(onlineUsers);
      next.delete(message.userId);
      onlineUsers = next;
    }
  });

  function isOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  const store: PresenceStore = {
    get onlineUsers() {
      return onlineUsers;
    },
    get onlineCount() {
      return onlineCount;
    },
    isOnline
  };

  setContext(PRESENCE_CONTEXT_KEY, store);
  return store;
}

export function getPresenceStore(): PresenceStore {
  const store = getContext<PresenceStore>(PRESENCE_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Presence store not found. Ensure createPresenceStore() is called in a parent component.'
    );
  }
  return store;
}
