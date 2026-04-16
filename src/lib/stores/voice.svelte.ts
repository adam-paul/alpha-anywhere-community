/**
 * Voice store — wraps LiveKit client SDK for voice chat.
 *
 * Manages room connection, participant tracking, and mic state.
 * One room at a time — joining a new room leaves the current one.
 */

import { getContext, setContext } from 'svelte';
import { env } from '$env/dynamic/public';
import type { VoiceConnectionState, VoiceParticipant, VoiceStore } from '$lib/types';

const VOICE_CONTEXT_KEY = 'voice';

export function createVoiceStore(): VoiceStore {
  let state = $state<VoiceConnectionState>({ status: 'disconnected' });
  let participants = $state(new Map<string, VoiceParticipant>());
  let isMuted = $state(false);

  // LiveKit internals (not exposed)
  let room: import('livekit-client').Room | null = null;
  let pageLeaveHandler: (() => void) | null = null;
  // Monotonic deadline (epoch ms). If Date.now() < suppressDisconnectUntil
  // when pagehide fires, we skip the auto-disconnect. Used to cover the brief
  // window around a Roblox deep-link launch, which fires pagehide even though
  // the tab isn't actually closing.
  let suppressDisconnectUntil = 0;

  // Derived
  const isConnected = $derived(state.status === 'connected');
  const roomName = $derived(
    state.status === 'connected' || state.status === 'connecting' ? state.roomName : null
  );
  const participantCount = $derived(participants.size + (isConnected ? 1 : 0));
  const localParticipant = $derived.by((): VoiceParticipant | null => {
    if (!room?.localParticipant || !isConnected) return null;
    const lp = room.localParticipant;
    return {
      identity: lp.identity,
      name: lp.name ?? lp.identity,
      isSpeaking: lp.isSpeaking,
      isMuted: !lp.isMicrophoneEnabled
    };
  });

  async function joinRoom(name: string): Promise<void> {
    // One room at a time
    if (room) leaveRoom();

    state = { status: 'connecting', roomName: name };

    try {
      // Get token
      const res = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: name })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to get voice token');
      }
      const { token } = await res.json();

      // Dynamic import to avoid SSR
      const { Room, RoomEvent } = await import('livekit-client');

      // Disable the SDK's built-in pagehide auto-disconnect and install our
      // own below. We need the same "tab close / quit / refresh" coverage the
      // default gives us, but with a suppression window so a Roblox deep-link
      // (window.location.href = roblox://...) — which also fires pagehide
      // while the tab stays alive — doesn't get misread as a close.
      const r = new Room({ disconnectOnPageLeave: false });

      // Participant events — Map reassignment for Svelte reactivity
      r.on(RoomEvent.ParticipantConnected, (p) => {
        const next = new Map(participants);
        next.set(p.identity, {
          identity: p.identity,
          name: p.name ?? p.identity,
          isSpeaking: false,
          isMuted: !p.isMicrophoneEnabled
        });
        participants = next;
      });

      r.on(RoomEvent.ParticipantDisconnected, (p) => {
        const next = new Map(participants);
        next.delete(p.identity);
        participants = next;
      });

      r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakingIds = new Set(speakers.map((s) => s.identity));
        const next = new Map<string, VoiceParticipant>();
        for (const [id, p] of participants) {
          next.set(id, { ...p, isSpeaking: speakingIds.has(id) });
        }
        participants = next;
      });

      r.on(RoomEvent.TrackMuted, (_pub, participant) => {
        if (participant.identity === r.localParticipant.identity) return;
        const existing = participants.get(participant.identity);
        if (existing) {
          const next = new Map(participants);
          next.set(participant.identity, { ...existing, isMuted: true });
          participants = next;
        }
      });

      r.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
        if (participant.identity === r.localParticipant.identity) return;
        const existing = participants.get(participant.identity);
        if (existing) {
          const next = new Map(participants);
          next.set(participant.identity, { ...existing, isMuted: false });
          participants = next;
        }
      });

      // Attach remote audio tracks for playback
      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio') {
          const el = track.attach();
          document.body.appendChild(el);
        }
      });

      r.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      r.on(RoomEvent.Disconnected, () => {
        leaveRoom();
      });

      // Connect and enable mic
      await r.connect(env.PUBLIC_LIVEKIT_URL!, token);
      await r.localParticipant.setMicrophoneEnabled(true);

      room = r;

      // Install our own pagehide handler for browser close / quit / refresh.
      // Skipped inside a deep-link launch window so Roblox hand-off doesn't
      // drop voice. Best-effort: if the tab dies before the signal flushes,
      // LiveKit's server-side participant timeout (~30s) still cleans up.
      pageLeaveHandler = () => {
        if (Date.now() < suppressDisconnectUntil) return;
        r.disconnect();
      };
      window.addEventListener('pagehide', pageLeaveHandler);

      // Populate existing remote participants
      const initial = new Map<string, VoiceParticipant>();
      for (const p of r.remoteParticipants.values()) {
        initial.set(p.identity, {
          identity: p.identity,
          name: p.name ?? p.identity,
          isSpeaking: p.isSpeaking,
          isMuted: !p.isMicrophoneEnabled
        });
      }
      participants = initial;

      state = { status: 'connected', roomName: name };
    } catch (e) {
      state = {
        status: 'error',
        message: e instanceof Error ? e.message : 'Failed to connect'
      };
      room = null;
    }
  }

  function leaveRoom(): void {
    if (pageLeaveHandler) {
      window.removeEventListener('pagehide', pageLeaveHandler);
      pageLeaveHandler = null;
    }
    room?.disconnect();
    room = null;
    participants = new Map();
    isMuted = false;
    state = { status: 'disconnected' };
  }

  function suppressAutoDisconnect(ms: number): void {
    suppressDisconnectUntil = Date.now() + ms;
  }

  function toggleMute(): void {
    if (!room) return;
    isMuted = !isMuted;
    room.localParticipant.setMicrophoneEnabled(!isMuted);
  }

  const store: VoiceStore = {
    get state() {
      return state;
    },
    get isConnected() {
      return isConnected;
    },
    get roomName() {
      return roomName;
    },
    get participants() {
      return participants;
    },
    get participantCount() {
      return participantCount;
    },
    get isMuted() {
      return isMuted;
    },
    get localParticipant() {
      return localParticipant;
    },
    joinRoom,
    leaveRoom,
    toggleMute,
    suppressAutoDisconnect
  };

  setContext(VOICE_CONTEXT_KEY, store);
  return store;
}

export function getVoiceStore(): VoiceStore {
  const store = getContext<VoiceStore>(VOICE_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      'Voice store not found. Ensure createVoiceStore() is called in a parent component.'
    );
  }
  return store;
}
