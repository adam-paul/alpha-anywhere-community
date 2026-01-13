<script lang="ts">
  import '../lib/styles/tokens.css';
  import '../lib/styles/themes/cel-shaded.css';
  import { AppShell } from '$lib/components/layout';
  import { createUserStore } from '$lib/stores/user.svelte';

  let { children } = $props();

  // Create user store (provides context to child components)
  const userStore = createUserStore();
</script>

<div class="app-root" data-theme="cel-shaded">
  <AppShell user={userStore.user}>
    {@render children()}
  </AppShell>
</div>

<style>
  .app-root {
    min-height: 100vh;
  }
</style>
