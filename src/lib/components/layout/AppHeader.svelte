<script lang="ts">
  import { Icon, Button } from '$lib/components/ui';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import { getVoiceStore } from '$lib/stores/voice.svelte';
  import { getUserStore } from '$lib/stores/user.svelte';
  import NotificationTray from './NotificationTray.svelte';
  import VoiceIndicator from '$lib/components/voice/VoiceIndicator.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
  }

  let { title = 'Alpha Anywhere Community', subtitle = 'Prototype Demo - staging' }: Props =
    $props();

  const userStore = getUserStore();
  const notifications = userStore.user ? getNotificationStore() : null;
  const voice = userStore.user ? getVoiceStore() : null;

  let triggerEl: HTMLDivElement | undefined = $state();

  // Close tray on click outside
  $effect(() => {
    if (!notifications?.isOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (triggerEl && !triggerEl.contains(e.target as Node)) {
        notifications!.close();
      }
    }
    window.addEventListener('click', onClickOutside, true);
    return () => window.removeEventListener('click', onClickOutside, true);
  });
</script>

<header class="app-header">
  <div class="header-title">
    <h1>{title}</h1>
    {#if subtitle}
      <p class="subtitle">{subtitle}</p>
    {/if}
  </div>

  <div class="header-actions">
    {#if voice?.isConnected}
      <VoiceIndicator store={voice} />
    {/if}
    {#if notifications}
      <div class="notification-trigger" bind:this={triggerEl}>
        <Button variant="ghost" size="sm" onclick={() => notifications.toggle()}>
          <Icon name="bell" size={20} />
          {#if notifications.unreadCount > 0}
            <span class="unread-badge">
              {notifications.unreadCount >= 20 ? '20+' : notifications.unreadCount}
            </span>
          {/if}
        </Button>
        {#if notifications.isOpen}
          <NotificationTray />
        {/if}
      </div>
    {:else}
      <Button variant="ghost" size="sm">
        <Icon name="bell" size={20} />
      </Button>
    {/if}
  </div>
</header>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--color-surface);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .header-title {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .header-title h1 {
    font-size: var(--font-size-xl);
    font-weight: 800;
    color: var(--color-text);
  }

  .subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .notification-trigger {
    position: relative;
  }

  .unread-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    background: var(--color-error);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-surface);
    pointer-events: none;
  }
</style>
