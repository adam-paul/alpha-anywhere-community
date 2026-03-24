<script lang="ts">
  interface Props {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
  }

  let { progress, size = 100, strokeWidth = 8 }: Props = $props();

  const radius = $derived((size - strokeWidth) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const offset = $derived(circumference - (progress / 100) * circumference);
  const center = $derived(size / 2);
  const isComplete = $derived(progress >= 100);
</script>

<svg
  class="progress-ring"
  class:complete={isComplete}
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  role="progressbar"
>
  <!-- Background track -->
  <circle
    class="progress-track"
    cx={center}
    cy={center}
    r={radius}
    stroke-width={strokeWidth}
    fill="none"
  />

  <!-- Progress arc -->
  <circle
    class="progress-fill"
    cx={center}
    cy={center}
    r={radius}
    stroke-width={strokeWidth}
    fill="none"
    stroke-dasharray={circumference}
    stroke-dashoffset={offset}
    transform="rotate(-90 {center} {center})"
  />

  <!-- Center percentage text -->
  <text
    x={center}
    y={center}
    class="progress-text"
    dominant-baseline="central"
    text-anchor="middle"
  >
    {Math.round(progress)}%
  </text>
</svg>

<style>
  .progress-ring {
    display: block;
  }

  .progress-track {
    stroke: var(--color-progress-track);
  }

  .progress-fill {
    stroke: var(--color-progress-incomplete);
    stroke-linecap: square;
    transition:
      stroke-dashoffset 0.5s ease,
      stroke 0.3s ease;
  }

  .progress-ring.complete .progress-fill {
    stroke: var(--color-progress-fill);
  }

  .progress-text {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 800;
    fill: var(--color-text);
  }
</style>
