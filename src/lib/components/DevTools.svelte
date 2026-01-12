<script lang="ts">
  import type { Theme } from '../types';

  interface Props {
    isLocked: boolean;
    xpCurrent: number;
    xpRequired: number;
    theme: Theme;
  }

  let { isLocked = $bindable(), xpCurrent = $bindable(), xpRequired, theme = $bindable() }: Props = $props();

  const themes: { value: Theme; label: string }[] = [
    { value: 'cel-shaded', label: 'Cel Shaded Pro' },
    { value: 'pixel', label: 'Pixel Art (coming soon)' },
    { value: 'roblox-3d', label: 'Roblox 3D (coming soon)' }
  ];

  let isOpen = $state(true);
</script>

<aside class="dev-tools" class:collapsed={!isOpen}>
  <button class="toggle-btn" onclick={() => isOpen = !isOpen}>
    {isOpen ? '−' : '+'}
  </button>

  {#if isOpen}
    <div class="dev-tools-content">
      <h4 class="dev-tools-title">Dev Tools</h4>

      <div class="control-group">
        <label class="control-label">
          <input
            type="checkbox"
            bind:checked={isLocked}
          />
          <span>Work Wall Locked</span>
        </label>
      </div>

      {#if isLocked}
        <div class="control-group">
          <span class="control-label">XP Progress: {xpCurrent} / {xpRequired}</span>
          <input
            type="range"
            min={0}
            max={xpRequired}
            bind:value={xpCurrent}
            class="range-input"
            aria-label="XP Progress"
          />
        </div>
      {/if}

      <div class="control-group">
        <label class="control-label" for="theme-select">Theme</label>
        <select id="theme-select" bind:value={theme} class="select-input">
          {#each themes as t (t.value)}
            <option value={t.value} disabled={t.value !== 'cel-shaded'}>
              {t.label}
            </option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
</aside>

<style>
  .dev-tools {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    padding: var(--space-4);
    min-width: 240px;
    z-index: 1000;
    font-size: var(--font-size-sm);
  }

  .dev-tools.collapsed {
    min-width: auto;
    padding: var(--space-2);
  }

  .toggle-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: var(--font-size-lg);
    font-weight: bold;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dev-tools-content {
    padding-right: var(--space-6);
  }

  .dev-tools-title {
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .control-group {
    margin-bottom: var(--space-3);
  }

  .control-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .control-label span {
    color: var(--color-text);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .range-input {
    width: 100%;
    margin-top: var(--space-2);
    cursor: pointer;
  }

  .select-input {
    width: 100%;
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 2px solid var(--color-border);
    background: var(--color-bg);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }
</style>
