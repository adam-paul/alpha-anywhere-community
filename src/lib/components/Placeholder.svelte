<script lang="ts">
  import { Icon } from '$lib/components/ui';

  type Size = 'sm' | 'lg';

  interface Props {
    title: string;
    description?: string;
    icon?: 'search' | 'chat' | 'user' | 'map';
    size?: Size;
  }

  let { title, description, icon, size = 'lg' }: Props = $props();
</script>

<div class="placeholder size-{size}">
  {#if icon && size === 'lg'}
    <div class="placeholder-icon">
      <Icon name={icon} size={48} />
    </div>
  {/if}
  {#if size === 'lg'}
    <h2 class="placeholder-title">{title}</h2>
    {#if description}
      <p class="placeholder-description">{description}</p>
    {/if}
  {:else}
    <p class="placeholder-message">{title}</p>
  {/if}
</div>

<style>
  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--color-text-muted);
  }

  /* Large - page-level empty states */
  .size-lg {
    padding: var(--space-12);
    min-height: 400px;
  }

  /* Small - inline list/grid empty states */
  .size-sm {
    padding: var(--space-8);
  }

  .placeholder-icon {
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }

  .placeholder-title {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
    color: var(--color-text);
  }

  .placeholder-description {
    font-size: var(--font-size-base);
    max-width: 400px;
    margin: 0;
  }

  .placeholder-message {
    font-size: var(--font-size-sm);
    margin: 0;
  }
</style>
