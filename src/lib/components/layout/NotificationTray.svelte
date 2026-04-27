<script lang="ts">
  import { Button, Placeholder } from '$lib/components/ui';
  import { getNotificationStore } from '$lib/stores/notifications.svelte';
  import NotificationItem from './NotificationItem.svelte';

  const store = getNotificationStore();
</script>

<div class="notification-tray">
  <header class="tray-header">
    <h3>Notifications</h3>
    {#if store.unreadCount > 0}
      <Button variant="ghost" size="sm" onclick={() => store.markAllAsRead()}>Mark all read</Button>
    {/if}
  </header>

  <div class="tray-list">
    {#each store.notifications as notification (notification.id)}
      <NotificationItem {notification} />
    {:else}
      <Placeholder size="sm" title="No notifications yet" />
    {/each}
  </div>
</div>

<style>
  .notification-tray {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 50;
    width: 360px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    backdrop-filter: var(--surface-backdrop-filter);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .tray-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .tray-header h3 {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text);
  }

  .tray-list {
    overflow-y: auto;
    flex: 1;
  }
</style>
