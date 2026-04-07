<script lang="ts">
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import { Button, Input, Icon, IconButton } from '$lib/components/ui';

  const voice = getVoiceStore();

  let roomName = $state('test-room');
</script>

<svelte:head>
  <title>Voice Test - Alpha Anywhere Community</title>
</svelte:head>

<div class="voice-test">
  <h1>Voice Chat Test</h1>
  <p class="description">
    Test LiveKit voice connectivity. Open two browser windows and join the same room.
  </p>

  {#if voice.state.status === 'disconnected' || voice.state.status === 'error'}
    <div class="join-form">
      <Input bind:value={roomName} placeholder="Room name" />
      <Button variant="primary" onclick={() => voice.joinRoom(roomName.trim())}>Join Room</Button>
    </div>
    {#if voice.state.status === 'error'}
      <p class="error">{voice.state.message}</p>
    {/if}
  {:else if voice.state.status === 'connecting'}
    <p class="connecting">Connecting to {voice.state.roomName}...</p>
  {:else}
    <div class="room-info">
      <div class="room-header">
        <h2>Room: {voice.roomName}</h2>
        <span class="you">Participants: {voice.participantCount}</span>
      </div>

      <div class="controls">
        <IconButton
          icon={voice.isMuted ? 'mic-off' : 'mic'}
          shape="circle"
          label={voice.isMuted ? 'Unmute' : 'Mute'}
          onclick={() => voice.toggleMute()}
        />
        <Button variant="danger" onclick={() => voice.leaveRoom()}>
          <Icon name="phone-off" size={16} />
          Leave
        </Button>
      </div>

      <div class="participants">
        <h3>Remote Participants ({voice.participants.size})</h3>
        {#if voice.participants.size === 0}
          <p class="empty">No one else is here yet...</p>
        {:else}
          <ul>
            {#each [...voice.participants.values()] as p (p.identity)}
              <li class:speaking={p.isSpeaking}>
                <span class="dot" class:active={p.isSpeaking}></span>
                {p.name}
                {#if p.isMuted}
                  <span class="muted-label">muted</span>
                {/if}
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

  .muted-label {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    margin-left: auto;
  }

  .speaking-label {
    font-size: var(--font-size-xs);
    color: var(--color-positive);
    margin-left: auto;
  }
</style>
