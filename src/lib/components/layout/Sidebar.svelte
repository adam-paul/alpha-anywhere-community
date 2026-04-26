<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Icon, Avatar, CountBadge } from '$lib/components/ui';
  import { SignInButton } from '@timeback/sdk/svelte';
  import { getUserStore } from '$lib/stores/user.svelte';
  import { getPresenceStore } from '$lib/stores/presence.svelte';
  import { getChatStore } from '$lib/stores/chat.svelte';
  import type { NavItem, FriendSummary } from '$lib/types';

  interface Props {
    friends?: FriendSummary[];
  }

  let { friends = [] }: Props = $props();

  const presence = getUserStore().user ? getPresenceStore() : null;
  const chat = getUserStore().user ? getChatStore() : null;

  const onlineFriends = $derived(presence ? friends.filter((f) => presence.isOnline(f.id)) : []);

  const userStore = getUserStore();

  const navItems: NavItem[] = [
    { href: '/explore', label: 'Explore', icon: 'search' },
    { href: '/chat', label: 'Chat', icon: 'chat' },
    { href: '/arcade', label: 'Arcade', icon: 'gamepad' }
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function handleSignOut() {
    goto('/api/signout');
  }
</script>

<aside class="sidebar">
  <nav class="sidebar-nav">
    {#each navItems as item (item.href)}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href, $page.url.pathname)}
        aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
      >
        <Icon name={item.icon} size={20} />
        <span class="nav-label">{item.label}</span>
        {#if item.href === '/chat' && chat && chat.chatUnreadCount > 0}
          <span class="nav-badge-position">
            <CountBadge count={chat.chatUnreadCount} />
          </span>
        {/if}
      </a>
    {/each}
  </nav>

  {#if onlineFriends.length > 0}
    <div class="online-friends">
      <span class="online-friends-label">Online — {onlineFriends.length}</span>
      <ul class="online-friends-list">
        {#each onlineFriends as friend (friend.id)}
          <li>
            <a href="/chat?with={friend.id}" class="online-friend-link">
              <Avatar
                src={friend.avatarUrl ?? undefined}
                alt={friend.displayName}
                size="sm"
                fallback={friend.displayName.charAt(0)}
                online
              />
              <span class="online-friend-name">{friend.displayName}</span>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="sidebar-user">
    {#if userStore.user}
      <a href="/profile/me" class="user-profile-link">
        <Avatar
          src={userStore.user.avatarUrl}
          alt={userStore.user.displayName}
          size="sm"
          fallback={userStore.user.displayName.charAt(0)}
        />
      </a>
      <div class="user-info">
        <a href="/profile/me" class="user-name-link">{userStore.user.displayName}</a>
        <button class="sign-out-link" onclick={handleSignOut}>Sign out</button>
      </div>
    {:else}
      <SignInButton size="sm" />
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 200px;
    background: var(--color-surface);
    border-right: var(--border-width) solid var(--color-border);
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    gap: var(--space-1);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    color: var(--color-text-muted);
    text-decoration: none;
    font-weight: 500;
    border-radius: var(--radius-zero);
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    color: var(--color-text);
    background: var(--color-bg);
  }

  .nav-item.active {
    color: var(--color-primary);
    background: var(--color-bg);
    font-weight: 600;
  }

  .nav-label {
    font-size: var(--font-size-sm);
  }

  .nav-badge-position {
    margin-left: auto;
  }

  .online-friends {
    padding: var(--space-4);
    border-top: var(--border-width) solid var(--color-border);
  }

  .online-friends-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .online-friends-list {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .online-friend-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    text-decoration: none;
    color: var(--color-text);
    border-radius: var(--radius-zero);
    transition: background var(--transition-fast);
  }

  .online-friend-link:hover {
    background: var(--color-bg);
  }

  .online-friend-name {
    font-size: var(--font-size-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-user {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: var(--border-width) solid var(--color-border);
    background: var(--color-bg);
  }

  .user-profile-link {
    display: block;
    position: relative;
    border-radius: 50%;
    transition: opacity var(--transition-fast);
  }

  .user-profile-link:hover {
    opacity: 0.8;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .user-name-link {
    font-size: var(--font-size-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: none;
    color: inherit;
  }

  .user-name-link:hover {
    text-decoration: underline;
  }

  .sign-out-link {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .sign-out-link:hover {
    color: var(--color-text);
  }
</style>
