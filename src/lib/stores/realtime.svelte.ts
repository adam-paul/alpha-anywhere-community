/**
 * Realtime WebSocket connection store.
 *
 * Connects to the alpha-realtime Worker via a Workers Route on the
 * same domain (/ws/channel/*). Authentication uses the existing
 * session cookie (sent automatically, same origin).
 *
 * Feature stores (chat, presence) subscribe via onMessage() and
 * handle their own message types.
 */

import { getContext, setContext, onDestroy } from 'svelte';
import type { RealtimeConnectionState, RealtimeStore } from '$lib/types';
import type { ChannelMessage } from '@alpha/shared/types';

const REALTIME_CONTEXT_KEY = 'realtime';
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

    const url = `wss://ws.alpha-community.school/channel/${channelId}`;
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

  onDestroy(() => disconnect());

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

  setContext(REALTIME_CONTEXT_KEY, store);
  return store;
}

export function getRealtimeStore(): RealtimeStore {
  const store = getContext<RealtimeStore>(REALTIME_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Realtime store not found. Ensure createRealtimeStore() is called in a parent component.'
    );
  }
  return store;
}
