<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Icon, Avatar } from '../ui';
  import { SignInButton } from 'timeback/svelte';
  import { getUserStore } from '$lib/stores/user.svelte';

  interface NavItem {
    href: string;
    label: string;
    icon: 'search' | 'chat' | 'gamepad';
  }

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
      </a>
    {/each}
  </nav>

  <div class="sidebar-user">
    {#if userStore.user}
      <a href="/profile/me" class="user-profile-link">
        <Avatar src={userStore.user.avatarUrl} alt={userStore.user.displayName} size="sm" fallback={userStore.user.displayName.charAt(0)} />
        <span class="user-name">{userStore.user.displayName}</span>
      </a>
      <button class="sign-out-link" onclick={handleSignOut}>Sign out</button>
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
    border-radius: var(--radius);
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

  .sidebar-user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: var(--border-width) solid var(--color-border);
    background: var(--color-bg);
  }

  .user-profile-link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius);
    text-decoration: none;
    color: inherit;
    transition: background var(--transition-fast);
  }

  .user-profile-link:hover {
    background: var(--color-surface);
  }

  .user-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
