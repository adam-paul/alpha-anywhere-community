<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { UserContext } from '$lib/types';
  import Sidebar from './Sidebar.svelte';
  import AppHeader from './AppHeader.svelte';

  interface Props {
    user?: UserContext;
    children: Snippet;
  }

  let { user, children }: Props = $props();
</script>

<div class="app-shell">
  <Sidebar {user} />

  <div class="app-main">
    <AppHeader />

    <main class="app-content">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    min-height: 100vh;
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .app-content {
    flex: 1;
    padding: var(--space-6);
    background: var(--color-bg);
    overflow-y: auto;
  }
</style>
