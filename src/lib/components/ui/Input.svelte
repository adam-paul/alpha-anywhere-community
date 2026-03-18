<script lang="ts">
  interface Props {
    id?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    type?: 'text' | 'email' | 'password' | 'url';
    oninput?: (e: Event) => void;
  }

  let { id, value = '', placeholder, disabled = false, type = 'text', oninput }: Props = $props();
</script>

<input class="input" {id} {type} {value} {placeholder} {disabled} {oninput} />

<style>
  .input {
    width: 100%;
    padding: var(--space-3);
    font-family: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .input::placeholder {
    color: var(--color-text-muted);
  }

  .input:focus {
    border-color: var(--color-primary);
  }

  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
