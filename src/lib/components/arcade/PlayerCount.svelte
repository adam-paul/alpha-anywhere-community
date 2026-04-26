<script lang="ts">
  interface Props {
    count: number;
  }

  let { count }: Props = $props();

  const label = $derived(count === 1 ? 'student playing' : 'students playing');
</script>

<div class="player-count">
  <span class="count-indicator"></span>
  <span class="count-text">{count} {label}</span>
</div>

<style>
  .player-count {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .count-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-side-by-side);
    animation: var(--animation-pulse);
  }

  .count-text {
    font-weight: 500;
  }
</style>
