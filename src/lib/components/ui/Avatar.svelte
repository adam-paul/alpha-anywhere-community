<script lang="ts">
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    src?: string;
    alt?: string;
    size?: Size;
    fallback?: string; // Initials or text to show if no image
  }

  let {
    src,
    alt = '',
    size = 'md',
    fallback = '?'
  }: Props = $props();

  let imageError = $state(false);

  function handleError() {
    imageError = true;
  }

  const showFallback = $derived(!src || imageError);
</script>

<div class="avatar size-{size}" title={alt}>
  {#if showFallback}
    <span class="fallback">{fallback}</span>
  {:else}
    <img {src} {alt} onerror={handleError} />
  {/if}
</div>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fallback {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  /* Sizes - use tokens from tokens.css */
  .size-sm {
    width: var(--avatar-size-sm);
    height: var(--avatar-size-sm);
    font-size: var(--font-size-xs);
  }

  .size-md {
    width: var(--avatar-size-md);
    height: var(--avatar-size-md);
    font-size: var(--font-size-sm);
  }

  .size-lg {
    width: var(--avatar-size-lg);
    height: var(--avatar-size-lg);
    font-size: var(--font-size-base);
  }
</style>
