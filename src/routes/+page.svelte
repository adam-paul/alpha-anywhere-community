<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/explore', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Alpha Anywhere Community</title>
</svelte:head>

<!-- Redirecting... -->
