<script lang="ts">
  import { Icon, Button } from '$lib/components/ui';

  interface Props {
    title?: string;
    subtitle?: string;
  }

  let { title = 'Alpha Anywhere Community', subtitle = 'Prototype Demo - staging' }: Props =
    $props();
</script>

<header class="app-header">
  <div class="header-title">
    <h1>{title}</h1>
    {#if subtitle}
      <p class="subtitle">{subtitle}</p>
    {/if}
  </div>

  <div class="header-actions">
    <Button variant="ghost" size="sm">
      <Icon name="bell" size={20} />
    </Button>
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
</style>
