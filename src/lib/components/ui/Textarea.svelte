<script lang="ts">
  interface Props {
    id?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    oninput?: (e: Event) => void;
  }

  let { id, value = '', placeholder, disabled = false, rows = 4, oninput }: Props = $props();
</script>

<textarea class="textarea" {id} {value} {placeholder} {disabled} {rows} {oninput}></textarea>

<style>
  .textarea {
    width: 100%;
    padding: var(--space-3);
    font-family: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    outline: none;
    resize: vertical;
    transition: border-color var(--transition-fast);
  }

  .textarea::placeholder {
    color: var(--color-text-muted);
  }

  .textarea:focus {
    border-color: var(--color-primary);
  }

  .textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
