<script lang="ts">
  import { IconButton } from '$lib/components/ui';
  import type { VoiceStore } from '$lib/types';

  interface Props {
    store: VoiceStore;
  }

  let { store }: Props = $props();

  const someoneIsSpeaking = $derived.by(() => {
    if (store.localParticipant?.isSpeaking) return true;
    for (const p of store.participants.values()) {
      if (p.isSpeaking) return true;
    }
    return false;
  });

  const displayName = $derived.by(() => {
    const name = store.roomName ?? '';
    if (name.startsWith('chat:')) return 'Voice Call';
    if (name.startsWith('game:')) return 'In Game';
    return name;
  });
</script>

{#if store.isConnected}
  <div class="voice-indicator">
    <span class="speaking-dot" class:active={someoneIsSpeaking}></span>
    <span class="room-name">{displayName}</span>
    <span class="participant-count">{store.participantCount}</span>
    <IconButton
      icon={store.isMuted ? 'mic-off' : 'mic'}
      shape="ghost"
      size="sm"
      label={store.isMuted ? 'Unmute' : 'Mute'}
      onclick={() => store.toggleMute()}
    />
    <IconButton
      icon="phone-off"
      shape="ghost"
      size="sm"
      label="Leave voice"
      onclick={() => store.leaveRoom()}
    />
    <span class="separator"></span>
  </div>
{/if}

<style>
  .voice-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .separator {
    display: block;
    width: 1px;
    height: 1.5rem;
    background: var(--color-border);
    margin-left: var(--space-1);
  }

  .speaking-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
    transition: background var(--transition-fast);
    flex-shrink: 0;
  }

  .speaking-dot.active {
    background: var(--color-positive);
    animation: var(--animation-pulse);
  }

  .room-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .participant-count {
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--color-text-muted);
  }
</style>
