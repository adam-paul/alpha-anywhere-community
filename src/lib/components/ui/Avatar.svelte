<script lang="ts">
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    src?: string;
    alt?: string;
    size?: Size;
    fallback?: string; // Initials or text to show if no image
    online?: boolean;
  }

  let { src, alt = '', size = 'md', fallback = '?', online }: Props = $props();

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
  {#if online}
    <span class="online-indicator"></span>
  {/if}
</div>

<style>
  .avatar {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    overflow: visible;
    flex-shrink: 0;
  }

  .avatar img,
  .avatar .fallback {
    border-radius: 50%;
    overflow: hidden;
  }

  .online-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 25%;
    height: 25%;
    min-width: 8px;
    min-height: 8px;
    background: var(--color-online);
    border-radius: 50%;
    border: 2px solid var(--color-bg);
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
