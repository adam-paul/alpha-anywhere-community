<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { createRealtimeStore } from '$lib/stores/realtime.svelte';
  import { getPresenceStore } from '$lib/stores/presence.svelte';
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import LobbyHeader from '$lib/components/arcade/LobbyHeader.svelte';
  import LobbyChat from '$lib/components/arcade/LobbyChat.svelte';
  import GamePanel from '$lib/components/arcade/GamePanel.svelte';
  import type { GamePresenceResponse, LobbyMessage, PresenceUser } from '$lib/types';
  import type { LobbyChatBroadcast } from '@alpha/shared/types';

  let { data } = $props();

  const presence = getPresenceStore();
  const voice = getVoiceStore();

  const user = $page.data.user!; // guaranteed by +page.server.ts redirect
  const gameId = $derived(data.game.id);
  const voiceRoom = $derived(`game:${gameId}`);

  // Filter presence to other users in this lobby, deduped (presence map is already
  // keyed by userId, so just excluding the current user suffices).
  const otherParticipants = $derived.by<PresenceUser[]>(() => {
    const out: PresenceUser[] = [];
    for (const u of presence.onlineUsers.values()) {
      if (u.userId === user.id) continue;
      if (u.currentLobby === gameId) out.push(u);
    }
    return out;
  });

  // Ephemeral chat state — joiners see only messages sent after they arrived.
  let messages = $state<LobbyMessage[]>([]);
  let composeText = $state('');
  let sendError = $state<string | null>(null);
  let localIdSeq = 0;

  // Robust against the link modal flipping state mid-session — clone server value.
  // svelte-ignore state_referenced_locally
  let robloxLinked = $state(data.robloxLinked);

  // In-game count — Roblox-only. Polled every 10s while the lobby is mounted.
  let inGameCount = $state(0);
  // svelte-ignore state_referenced_locally
  let inGameLoading = $state(data.game.type === 'roblox');

  let lobbyChannel: ReturnType<typeof createRealtimeStore> | null = null;

  function isLobbyChat(msg: unknown): msg is LobbyChatBroadcast {
    return (
      typeof msg === 'object' &&
      msg !== null &&
      (msg as { type?: string }).type === 'lobby:chat' &&
      typeof (msg as LobbyChatBroadcast).content === 'string' &&
      typeof (msg as LobbyChatBroadcast).senderDisplayName === 'string'
    );
  }

  async function fetchInGameCount() {
    if (data.game.type !== 'roblox') {
      inGameLoading = false;
      return;
    }
    try {
      const res = await fetch(`/api/arcade/game-presence?gameId=${gameId}`);
      if (res.ok) {
        const body = (await res.json()) as GamePresenceResponse;
        inGameCount = body.inGameCount;
      }
    } catch {
      // Silent — next poll will try again
    } finally {
      inGameLoading = false;
    }
  }

  $effect(() => {
    // 1. Announce lobby membership on the presence socket.
    presence.setCurrentLobby(gameId);

    // 2. Open the per-lobby channel for ephemeral chat broadcasts.
    const ch = createRealtimeStore(`lobby:${gameId}`);
    ch.onMessage((msg) => {
      if (!isLobbyChat(msg)) return;
      if (msg.senderId === user.id) return; // we already appended locally
      messages = [
        ...messages,
        {
          senderId: msg.senderId,
          senderDisplayName: msg.senderDisplayName,
          content: msg.content,
          timestamp: msg.timestamp,
          status: 'sent',
          localId: `${msg.senderId}:${msg.timestamp}:${nextLocalId()}`
        }
      ];
    });
    ch.connect();
    lobbyChannel = ch;

    // 3. Auto-enroll in voice. voice store's one-room-at-a-time rule handles
    //    cleanly leaving any prior room (chat call, etc.).
    voice.joinRoom(voiceRoom);

    // 4. Initial in-game count fetch + 10s polling loop.
    fetchInGameCount();
    const pollInterval = setInterval(fetchInGameCount, 10_000);

    return () => {
      clearInterval(pollInterval);
      presence.setCurrentLobby(null);
      ch.disconnect();
      lobbyChannel = null;
      // Only leave voice if we're still in this lobby's room — user may have
      // already switched to another lobby/chat call.
      if (voice.roomName === voiceRoom) voice.leaveRoom();
    };
  });

  function nextLocalId(): string {
    localIdSeq += 1;
    return String(localIdSeq);
  }

  async function handleSend() {
    const trimmed = composeText.trim();
    if (!trimmed) return;

    const localId = `${user.id}:${Date.now()}:${nextLocalId()}`;
    const optimistic: LobbyMessage = {
      senderId: user.id,
      senderDisplayName: user.displayName,
      content: trimmed,
      timestamp: Date.now(),
      status: 'pending',
      localId
    };
    messages = [...messages, optimistic];
    composeText = '';
    sendError = null;

    try {
      const res = await fetch(`/api/lobby/${gameId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        messages = messages.filter((m) => m.localId !== localId);
        if (body.error === 'moderation_rejected') {
          sendError = body.message ?? 'Message was rejected by moderation.';
          composeText = trimmed;
        } else {
          sendError = body.message ?? 'Failed to send.';
          composeText = trimmed;
        }
        return;
      }

      messages = messages.map((m) => (m.localId === localId ? { ...m, status: 'sent' } : m));

      if (lobbyChannel?.isConnected) {
        lobbyChannel.send({
          type: 'lobby:chat',
          content: trimmed,
          senderDisplayName: user.displayName
        });
      }
    } catch (err) {
      messages = messages.filter((m) => m.localId !== localId);
      sendError = err instanceof Error ? err.message : 'Failed to send.';
      composeText = trimmed;
    }
  }

  function handleLaunchInitiated() {
    // Optimistic +1 on the in-game count. The next poll will reconcile with
    // Roblox's Presence API (which is the ground truth for this panel).
    if (data.game.type === 'roblox') inGameCount += 1;
  }

  function handleRobloxLinked() {
    robloxLinked = true;
  }

  function handleBack() {
    goto('/arcade');
  }
</script>

<svelte:head>
  <title>{data.game.title} Lobby — Alpha Anywhere Community</title>
</svelte:head>

<div class="lobby-page">
  <LobbyHeader game={data.game} {otherParticipants} onback={handleBack} />
  <div class="lobby-body">
    <div class="chat-column">
      <LobbyChat
        {messages}
        currentUserId={user.id}
        bind:composeText
        {sendError}
        onsubmit={handleSend}
      />
    </div>
    <div class="panel-column">
      <GamePanel
        game={data.game}
        {robloxLinked}
        {inGameCount}
        {inGameLoading}
        onlaunch={handleLaunchInitiated}
        onlinked={handleRobloxLinked}
      />
    </div>
  </div>
</div>

<style>
  .lobby-page {
    /* Edge-to-edge inside AppShell's padding, mirrors /chat. */
    margin: calc(-1 * var(--space-6));
    height: calc(100% + var(--space-6) * 2);
    display: flex;
    flex-direction: column;
  }

  .lobby-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .chat-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-column {
    width: 320px;
    flex-shrink: 0;
  }

  @media (max-width: 720px) {
    .lobby-body {
      flex-direction: column-reverse;
    }
    .panel-column {
      width: 100%;
    }
  }
</style>
