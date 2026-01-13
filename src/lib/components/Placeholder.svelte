<script lang="ts">
  import { Icon } from './ui';

  interface Props {
    title: string;
    description?: string;
    icon?: 'search' | 'chat' | 'user' | 'map';
  }

  let { title, description = 'This feature is coming soon.', icon }: Props = $props();
</script>

<div class="placeholder">
  {#if icon}
    <div class="placeholder-icon">
      <Icon name={icon} size={48} />
    </div>
  {/if}
  <h2 class="placeholder-title">{title}</h2>
  <p class="placeholder-description">{description}</p>
</div>

<style>
  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-12);
    min-height: 400px;
  }

  .placeholder-icon {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
    opacity: 0.5;
  }

  .placeholder-title {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .placeholder-description {
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    max-width: 400px;
  }
</style>
