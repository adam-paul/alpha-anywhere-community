<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import '../lib/styles/tokens.css';
  import '../lib/styles/themes/cel-shaded.css';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import { createUserStore } from '$lib/stores/user.svelte';
  import { createRealtimeStore } from '$lib/stores/realtime.svelte';
  import { createPresenceStore } from '$lib/stores/presence.svelte';
  import { createNotificationStore } from '$lib/stores/notifications.svelte';
  import { createVoiceStore } from '$lib/stores/voice.svelte';
  import { createChatStore } from '$lib/stores/chat.svelte';
  import type { ChatParticipant, Conversation, Notification } from '$lib/types';

  interface Props {
    data: {
      user: import('$lib/types').UserContext | null;
      friends: ChatParticipant[];
      notifications: Notification[];
      notificationUnreadCount: number;
      conversations: Conversation[];
    };
    children: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  // Create user store with session from server (sets context for child components)
  // svelte-ignore state_referenced_locally
  createUserStore(data.user);

  // Create app-wide presence — always create stores so components never crash,
  // but only connect WebSocket when authenticated
  const realtime = createRealtimeStore('presence:global');
  createPresenceStore(realtime);
  // svelte-ignore state_referenced_locally
  createNotificationStore(
    data.notifications,
    data.notificationUnreadCount,
    realtime,
    data.user?.id ?? ''
  );
  createVoiceStore();
  // Chat store lives at layout level so the sidebar badge (chatUnreadCount)
  // and any future cross-route chat surfaces share one source of truth.
  // svelte-ignore state_referenced_locally
  createChatStore({
    conversations: data.conversations,
    currentUserId: data.user?.id ?? '',
    friends: data.friends,
    realtime
  });
  // svelte-ignore state_referenced_locally
  if (data.user) {
    realtime.connect();
  }
  onDestroy(() => realtime.disconnect());

  // Set timezone cookie so the server can query XP for the correct local date.
  // Session-scoped (no max-age) — refreshes when the browser reopens.
  onMount(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !document.cookie.includes(`tz=${tz}`)) {
      document.cookie = `tz=${tz};path=/;SameSite=Lax`;
    }
  });
</script>

<div class="app-root" data-theme="cel-shaded">
  <AppShell friends={data.friends}>
    {@render children()}
  </AppShell>
</div>

<style>
  .app-root {
    height: 100vh;
    overflow: hidden;
  }
</style>
