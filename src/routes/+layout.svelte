<script lang="ts">
  import '../lib/styles/tokens.css';
  import '../lib/styles/themes/cel-shaded.css';
  import { AppShell } from '$lib/components/layout';
  import { createUserStore } from '$lib/stores/user.svelte';

  interface Props {
    data: {
      user: import('$lib/types').UserContext | null;
    };
    children: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  // Create user store with session from server (sets context for child components)
  // svelte-ignore state_referenced_locally
  createUserStore(data.user);
</script>

<div class="app-root" data-theme="cel-shaded">
  <AppShell>
    {@render children()}
  </AppShell>
</div>

<style>
  .app-root {
    height: 100vh;
    overflow: hidden;
  }
</style>
