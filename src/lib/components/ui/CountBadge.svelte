<script lang="ts">
  interface Props {
    count: number;
    max?: number;
  }

  let { count, max = 20 }: Props = $props();

  const display = $derived(count >= max ? `${max}+` : `${count}`);
</script>

<span class="count-badge">{display}</span>

<style>
  .count-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--color-on-primary);
    background: var(--color-error);
    border-radius: var(--radius-md);
  }
</style>
