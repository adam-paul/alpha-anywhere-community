<script lang="ts">
  import ArcadeWidget from '$lib/components/ArcadeWidget.svelte';
  import DevTools from '$lib/components/DevTools.svelte';
  import { DEFAULT_CONFIG, MOCK_GATING_LOCKED, MOCK_GATING_UNLOCKED } from '$lib/mock-data';
  import type { WidgetConfig, Theme } from '$lib/types';

  // Dev state
  let isLocked = $state(false);
  let xpCurrent = $state(67);
  let theme: Theme = $state('cel-shaded');

  // Computed config
  let config = $derived<WidgetConfig>({
    ...DEFAULT_CONFIG,
    theme,
    gatingState: {
      mode: 'daily',
      isUnlocked: !isLocked,
      xpCurrent: isLocked ? xpCurrent : 120,
      xpRequired: 120
    }
  });

  // Handle widget events
  function handleWidgetEvent(event: CustomEvent) {
    console.log('Widget event:', event.detail);
  }
</script>

<svelte:head>
  <title>Alpha Arcade - Demo</title>
</svelte:head>

<main class="demo-page">
  <header class="demo-header">
    <h1>Alpha Arcade</h1>
    <p class="subtitle">Prototype Demo</p>
  </header>

  <div class="demo-content">
    <ArcadeWidget {config} on:event={handleWidgetEvent} />
  </div>

  <DevTools
    bind:isLocked
    bind:xpCurrent
    bind:theme
    xpRequired={120}
  />
</main>

<style>
  .demo-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-6);
    background: var(--color-bg);
  }

  .demo-header {
    text-align: center;
    margin-bottom: var(--space-8);
  }

  .demo-header h1 {
    font-size: var(--font-size-3xl);
    font-weight: 800;
    color: var(--color-text);
    margin-bottom: var(--space-2);
  }

  .subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .demo-content {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
</style>
