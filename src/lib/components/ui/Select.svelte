<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    options: Option[];
    value: string;
    placeholder?: string;
    disabled?: boolean;
    onchange?: (value: string) => void;
  }

  let {
    options,
    value = $bindable(),
    placeholder = 'Select...',
    disabled = false,
    onchange
  }: Props = $props();

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    value = target.value;
    onchange?.(target.value);
  }
</script>

<div class="select-wrapper" class:disabled>
  <select {value} {disabled} onchange={handleChange}>
    {#if placeholder}
      <option value="" disabled={value !== ''}>{placeholder}</option>
    {/if}
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
</div>

<style>
  .select-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  select {
    appearance: none;
    padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
    font-family: var(--font-display);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all var(--transition-fast);
    min-width: 140px;
  }

  select:hover:not(:disabled) {
    border-color: var(--color-text-muted);
  }

  select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha, rgba(59, 130, 246, 0.2));
  }

  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chevron {
    position: absolute;
    right: var(--space-2);
    pointer-events: none;
    color: var(--color-text-muted);
  }

  .disabled .chevron {
    opacity: 0.5;
  }
</style>
