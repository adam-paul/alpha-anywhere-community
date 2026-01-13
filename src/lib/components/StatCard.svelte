<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    icon?: string;
  }

  let { label, value, icon }: Props = $props();
</script>

<div class="stat-card">
  {#if icon}
    <span class="stat-icon">{icon}</span>
  {/if}
  <span class="stat-label">{label}</span>
  <span class="stat-value">{value}</span>
</div>

<style>
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
  }

  .stat-icon {
    font-size: var(--font-size-lg);
  }

  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 800;
    font-family: var(--font-display);
  }
</style>
