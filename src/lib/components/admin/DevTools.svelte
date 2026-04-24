<script lang="ts">
  import { Select } from '$lib/components/ui';
  import { themeStore } from '$lib/stores/theme.svelte';
  import type { Theme } from '$lib/types';

  interface Props {
    isLocked: boolean;
    progressCurrent: number;
    progressRequired: number;
    unitLabel: string;
    onchange?: () => void;
  }

  let {
    isLocked = $bindable(),
    progressCurrent = $bindable(),
    progressRequired,
    unitLabel,
    onchange
  }: Props = $props();

  function handleChange() {
    onchange?.();
  }

  const themes: { value: Theme; label: string; disabled?: boolean }[] = [
    { value: 'playcademy', label: 'Playcademy' },
    { value: 'cel-shaded', label: 'Cel Shaded Pro' },
    { value: 'pixel', label: 'Pixel Art (coming soon)', disabled: true },
    { value: 'roblox-3d', label: 'Roblox 3D (coming soon)', disabled: true }
  ];

  let isOpen = $state(true);
</script>

<aside class="dev-tools" class:collapsed={!isOpen}>
  <button class="toggle-btn" onclick={() => (isOpen = !isOpen)}>
    {isOpen ? '−' : '+'}
  </button>

  {#if isOpen}
    <div class="dev-tools-content">
      <h4 class="dev-tools-title">Dev Tools</h4>

      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" bind:checked={isLocked} onchange={handleChange} />
          <span>Work Wall Locked</span>
        </label>
      </div>

      {#if isLocked}
        <div class="control-group">
          <span class="control-label">{unitLabel}: {progressCurrent} / {progressRequired}</span>
          <input
            type="range"
            min={0}
            max={progressRequired}
            bind:value={progressCurrent}
            oninput={handleChange}
            class="range-input"
            aria-label="Progress"
          />
        </div>
      {/if}

      <div class="control-group">
        <label class="control-label" for="theme-select">Theme</label>
        <Select id="theme-select" options={themes} bind:value={themeStore.theme} />
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

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .range-input {
    width: 100%;
    margin-top: var(--space-2);
    cursor: pointer;
  }
</style>
