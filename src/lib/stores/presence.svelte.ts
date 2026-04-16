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

  // Request snapshot once connected (can't send eagerly from DO's fetch
  // because the client WebSocket isn't open yet when the 101 is returned)
  $effect(() => {
    if (realtime.isConnected) {
      realtime.send({ type: 'presence:snapshot-request' });
    }
  });

  realtime.onMessage((message) => {
    if (message.type === 'presence:snapshot') {
      const next = new Map<string, PresenceUser>();
      for (const user of message.users) {
        next.set(user.userId, {
          userId: user.userId,
          displayName: user.displayName,
          currentLobby: user.currentLobby
        });
      }
      onlineUsers = next;
    } else if (message.type === 'system:join') {
      const next = new Map(onlineUsers);
      next.set(message.userId, {
        userId: message.userId,
        displayName: message.displayName,
        currentLobby: null
      });
      onlineUsers = next;
    } else if (message.type === 'system:leave') {
      const next = new Map(onlineUsers);
      next.delete(message.userId);
      onlineUsers = next;
    } else if (message.type === 'lobby:state') {
      const existing = onlineUsers.get(message.userId);
      if (!existing) return;
      const next = new Map(onlineUsers);
      next.set(message.userId, { ...existing, currentLobby: message.lobbyId });
      onlineUsers = next;
    }
  });

  function isOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }

  // Announce this connection's current game-lobby state on the presence socket.
  // Pass a lobbyId to enter; pass null to leave. The DO updates this connection's
  // attachment and broadcasts lobby:state to all other clients so they can derive
  // per-game tile counts without opening any new channels.
  function setCurrentLobby(lobbyId: string | null): void {
    if (lobbyId === null) {
      realtime.send({ type: 'lobby:leave' });
    } else {
      realtime.send({ type: 'lobby:enter', lobbyId });
    }
  }

  const store: PresenceStore = {
    get onlineUsers() {
      return onlineUsers;
    },
    get onlineCount() {
      return onlineCount;
    },
    isOnline,
    setCurrentLobby
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
