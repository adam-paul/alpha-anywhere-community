<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { Button, Input, Icon, IconButton } from '$lib/components/ui';

  type Participant = {
    identity: string;
    name: string;
    isSpeaking: boolean;
  };

  let roomName = $state('test-room');
  let status = $state<'disconnected' | 'connecting' | 'connected'>('disconnected');
  let errorMsg = $state('');
  let isMuted = $state(false);
  let participants = $state<Participant[]>([]);
  let localIdentity = $state('');

  // LiveKit Room reference (loaded dynamically to avoid SSR)
  let room: import('livekit-client').Room | null = null;

  async function joinRoom() {
    if (!roomName.trim()) return;
    status = 'connecting';
    errorMsg = '';

    try {
      // Get token from our API
      const res = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomName.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to get token');
      }
      const { token } = await res.json();

      // Dynamic import to avoid SSR issues
      const { Room, RoomEvent } = await import('livekit-client');

      room = new Room();

      // Wire events
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        participants = [
          ...participants,
          {
            identity: participant.identity,
            name: participant.name ?? participant.identity,
            isSpeaking: false
          }
        ];
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        participants = participants.filter((p) => p.identity !== participant.identity);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakingIds = new Set(speakers.map((s) => s.identity));
        participants = participants.map((p) => ({
          ...p,
          isSpeaking: speakingIds.has(p.identity)
        }));
      });

      // Attach remote audio tracks to DOM for playback
      room.on(RoomEvent.TrackSubscribed, (track, _publication, _participant) => {
        if (track.kind === 'audio') {
          const el = track.attach();
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      room.on(RoomEvent.Disconnected, () => {
        leaveRoom();
      });

      // Connect
      await room.connect(env.PUBLIC_LIVEKIT_URL!, token);
      localIdentity = room.localParticipant.identity;

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      // Populate existing participants
      participants = Array.from(room.remoteParticipants.values()).map((p) => ({
        identity: p.identity,
        name: p.name ?? p.identity,
        isSpeaking: p.isSpeaking
      }));

      status = 'connected';
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to connect';
      status = 'disconnected';
    }
  }

  function leaveRoom() {
    room?.disconnect();
    room = null;
    participants = [];
    isMuted = false;
    localIdentity = '';
    status = 'disconnected';
  }

  function toggleMute() {
    if (!room) return;
    isMuted = !isMuted;
    room.localParticipant.setMicrophoneEnabled(!isMuted);
  }
</script>

<svelte:head>
  <title>Voice Test - Alpha Anywhere Community</title>
</svelte:head>

<div class="voice-test">
  <h1>Voice Chat Test</h1>
  <p class="description">
    Test LiveKit voice connectivity. Open two browser windows and join the same room.
  </p>

  {#if status === 'disconnected'}
    <div class="join-form">
      <Input bind:value={roomName} placeholder="Room name" />
      <Button variant="primary" onclick={joinRoom}>Join Room</Button>
    </div>
    {#if errorMsg}
      <p class="error">{errorMsg}</p>
    {/if}
  {:else if status === 'connecting'}
    <p class="connecting">Connecting...</p>
  {:else}
    <div class="room-info">
      <div class="room-header">
        <h2>Room: {roomName}</h2>
        <span class="you">You: {localIdentity}</span>
      </div>

      <div class="controls">
        <IconButton
          icon={isMuted ? 'mic-off' : 'mic'}
          shape="circle"
          label={isMuted ? 'Unmute' : 'Mute'}
          onclick={toggleMute}
        />
        <Button variant="danger" onclick={leaveRoom}>
          <Icon name="phone-off" size={16} />
          Leave
        </Button>
      </div>

      <div class="participants">
        <h3>Participants ({participants.length})</h3>
        {#if participants.length === 0}
          <p class="empty">No one else is here yet...</p>
        {:else}
          <ul>
            {#each participants as p (p.identity)}
              <li class:speaking={p.isSpeaking}>
                <span class="dot" class:active={p.isSpeaking}></span>
                {p.name}
                {#if p.isSpeaking}
                  <span class="speaking-label">speaking</span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .voice-test {
    max-width: 500px;
    margin: 0 auto;
  }

  h1 {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    margin-bottom: var(--space-2);
  }

  .description {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-6);
  }

  .join-form {
    display: flex;
    gap: var(--space-3);
    align-items: flex-end;
  }

  .error {
    color: var(--color-error);
    font-size: var(--font-size-sm);
    margin-top: var(--space-2);
  }

  .connecting {
    color: var(--color-text-muted);
  }

  .room-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .room-header h2 {
    font-size: var(--font-size-lg);
    font-weight: 700;
  }

  .you {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .participants h3 {
    font-size: var(--font-size-sm);
    font-weight: 600;
    margin-bottom: var(--space-2);
  }

  .empty {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    font-size: var(--font-size-sm);
  }

  li.speaking {
    border-color: var(--color-positive);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
    flex-shrink: 0;
  }

  .dot.active {
    background: var(--color-positive);
  }

  .speaking-label {
    font-size: var(--font-size-xs);
    color: var(--color-positive);
    margin-left: auto;
  }
</style>
