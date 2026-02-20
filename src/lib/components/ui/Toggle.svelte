<script lang="ts">
  interface Props {
    checked: boolean;
    onchange: () => void;
    label: string;
    disabled?: boolean;
  }

  let { checked, onchange, label, disabled = false }: Props = $props();
</script>

<button
  class="toggle"
  class:active={checked}
  {disabled}
  onclick={onchange}
  role="switch"
  aria-checked={checked}
  aria-label={label}
  type="button"
>
  <span class="toggle-thumb"></span>
</button>

<style>
  .toggle {
    position: relative;
    width: 2.75rem;
    height: 1.5rem;
    background: var(--color-border);
    border: none;
    border-radius: var(--radius-pill);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle.active {
    background: var(--color-primary);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 1.25rem;
    height: 1.25rem;
    background: var(--color-on-primary);
    border-radius: 50%;
    transition: transform var(--transition-fast);
  }

  .toggle.active .toggle-thumb {
    transform: translateX(1.25rem);
  }
</style>
