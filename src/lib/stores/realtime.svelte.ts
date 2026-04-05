/**
 * Realtime WebSocket connection store.
 *
 * Connects to the alpha-realtime Worker via cookie-authenticated
 * WebSocket. URL controlled by PUBLIC_REALTIME_URL env var
 * (defaults to wss://ws.alpha-community.school).
 *
 * Used for both persistent connections (presence:global in layout)
 * and per-conversation connections (chat:conv-{id} in chat page).
 * Callers manage lifecycle — call disconnect() when done.
 *
 * Feature stores (chat, presence, notifications) subscribe via
 * onMessage() and handle their own message types.
 */

import { env } from '$env/dynamic/public';
import type { RealtimeConnectionState, RealtimeStore } from '$lib/types';
import type { ChannelMessage } from '@alpha/shared/types';

const REALTIME_BASE_URL = env.PUBLIC_REALTIME_URL;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const KEEPALIVE_INTERVAL = 30_000;

export function createRealtimeStore(channelId: string): RealtimeStore {
  let state = $state<RealtimeConnectionState>({ status: 'disconnected' });
  let ws: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  const messageHandlers = new Set<(message: ChannelMessage) => void>();

  const isConnected = $derived(state.status === 'connected');

  function connect() {
    if (ws) return;
    state = { status: 'connecting' };

    const url = `${REALTIME_BASE_URL}/channel/${channelId}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      state = { status: 'connected' };
      reconnectAttempt = 0;
      keepaliveTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
      }, KEEPALIVE_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const message: ChannelMessage = JSON.parse(event.data);
        for (const handler of messageHandlers) {
          handler(message);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      ws = null;
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      if (event.code === 1000) {
        state = { status: 'disconnected' };
        return;
      }
      attemptReconnect();
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, reconnect logic lives there
    };
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    reconnectAttempt = 0;
    if (ws) {
      ws.close(1000, 'Client disconnect');
      ws = null;
    }
    state = { status: 'disconnected' };
  }

  function attemptReconnect() {
    reconnectAttempt++;
    if (reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
      state = { status: 'failed', reason: 'Max reconnect attempts exceeded' };
      return;
    }
    state = { status: 'reconnecting', attempt: reconnectAttempt };
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempt - 1);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function send(message: { type: string; [key: string]: unknown }) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function onMessage(handler: (message: ChannelMessage) => void): () => void {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  }

  const store: RealtimeStore = {
    get state() {
      return state;
    },
    get isConnected() {
      return isConnected;
    },
    send,
    connect,
    disconnect,
    onMessage
  };

  return store;
}
