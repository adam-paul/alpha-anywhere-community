<script lang="ts">
  interface Props {
    date: Date;
  }

  let { date }: Props = $props();

  function formatDate(d: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  }
</script>

<div class="date-separator">
  <span class="date-label">{formatDate(date)}</span>
</div>

<style>
  .date-separator {
    display: flex;
    justify-content: center;
    padding: var(--space-4) 0;
  }

  .date-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    background: var(--color-bg);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-md);
    border: var(--border-width) solid var(--color-border);
  }
</style>
