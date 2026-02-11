<script lang="ts">
  import type { ViewMode } from '$lib/stores/explore.svelte';
  import { ToggleButton } from './ui';

  interface Props {
    mode: ViewMode;
    disabled?: boolean;
    onchange?: (mode: ViewMode) => void;
  }

  let { mode = $bindable(), disabled = false, onchange }: Props = $props();

  function setMode(newMode: ViewMode) {
    mode = newMode;
    onchange?.(newMode);
  }
</script>

<div class="view-toggle">
  <ToggleButton active={mode === 'grid'} {disabled} onclick={() => setMode('grid')}>
    Grid
  </ToggleButton>
  <ToggleButton active={mode === 'map'} {disabled} onclick={() => setMode('map')}>Map</ToggleButton>
</div>

<style>
  .view-toggle {
    display: flex;
    gap: var(--space-1);
  }
</style>
