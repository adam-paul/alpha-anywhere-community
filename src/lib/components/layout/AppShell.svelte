<script lang="ts">
  import type { Snippet } from 'svelte';
  import Sidebar from './Sidebar.svelte';
  import AppHeader from './AppHeader.svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="app-shell">
  <Sidebar />

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
    height: 100vh;
    overflow: hidden;
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100vh;
  }

  .app-content {
    flex: 1;
    padding: var(--space-6);
    background: var(--color-bg);
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
</style>
