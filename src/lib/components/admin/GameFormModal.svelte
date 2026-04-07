<script lang="ts">
  import { Button, Icon, Input, Modal, Select, Textarea, Toggle } from '$lib/components/ui';
  import { ENGAGEMENT_CATEGORIES } from '$lib/constants';
  import type {
    EngagementCategory,
    GameFormData,
    GameFormMode,
    GameGameFormStatus,
    GameType,
    RobloxLookupResult
  } from '$lib/types';

  interface Props {
    open: boolean;
    onclose: () => void;
    mode: GameFormMode;
    initialData?: GameFormData;
    hasCredentials?: boolean;
    onsave: () => void;
  }

  let { open, onclose, mode, initialData, hasCredentials = false, onsave }: Props = $props();

  // Form state
  let title = $state('');
  let slug = $state('');
  let slugManuallyEdited = $state(false);
  let type = $state<string>('roblox');
  let engagementCategory = $state<string>('side-by-side');
  let description = $state('');
  let thumbnailUrl = $state('');
  let launchUrl = $state('');
  let placeId = $state('');
  let accessCode = $state('');
  let linkCode = $state('');
  let isActive = $state(false);
  let robloxUrl = $state('');
  let status = $state<GameFormStatus>('idle');
  let errorMessage = $state('');

  const isEdit = $derived(mode.kind === 'edit');
  const isRoblox = $derived(type === 'roblox');
  const credentialsPresent = $derived(hasCredentials || (!!accessCode && !!linkCode));
  const showCredentialsWarning = $derived(isRoblox && isActive && !credentialsPresent);
  const canSave = $derived(
    title &&
      slug &&
      type &&
      engagementCategory &&
      launchUrl &&
      status !== 'saving' &&
      status !== 'looking-up'
  );

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const typeOptions = [
    { value: 'roblox', label: 'Roblox' },
    { value: 'minecraft', label: 'Minecraft' },
    { value: 'web', label: 'Web' },
    { value: 'iframe', label: 'iFrame' }
  ];

  const categoryOptions = Object.entries(ENGAGEMENT_CATEGORIES).map(([key, meta]) => ({
    value: key,
    label: meta.label
  }));

  // Reset form when modal opens
  $effect(() => {
    if (open) {
      if (initialData) {
        title = initialData.title;
        slug = mode.kind === 'edit' ? mode.gameId : slugify(initialData.title);
        slugManuallyEdited = true;
        type = initialData.type;
        engagementCategory = initialData.engagementCategory;
        description = initialData.description;
        thumbnailUrl = initialData.thumbnailUrl;
        launchUrl = initialData.launchUrl;
        placeId = initialData.placeId;
        isActive = initialData.isActive;
      } else {
        title = '';
        slug = '';
        slugManuallyEdited = false;
        type = 'roblox';
        engagementCategory = 'side-by-side';
        description = '';
        thumbnailUrl = '';
        launchUrl = '';
        placeId = '';
        isActive = false;
      }
      // Credentials always start blank (write-only)
      accessCode = '';
      linkCode = '';
      robloxUrl = '';
      status = 'idle';
      errorMessage = '';
    }
  });

  function inputValue(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  async function handleLookup() {
    if (!robloxUrl) return;
    status = 'looking-up';
    errorMessage = '';

    try {
      const res = await fetch('/api/admin/games/roblox-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: robloxUrl })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lookup failed');
      }

      const { result } = (await res.json()) as { result: RobloxLookupResult };
      title = result.title;
      if (!slugManuallyEdited) slug = slugify(result.title);
      description = result.description;
      thumbnailUrl = result.thumbnailUrl;
      placeId = result.placeId;
      launchUrl = result.launchUrl;
      type = 'roblox';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Lookup failed';
    } finally {
      status = 'idle';
    }
  }

  async function handleSave() {
    status = 'saving';
    errorMessage = '';

    const body: Record<string, unknown> = {
      title,
      slug,
      type: type as GameType,
      engagementCategory: engagementCategory as EngagementCategory,
      description: description || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      launchUrl,
      placeId: placeId || undefined,
      isActive
    };

    // Only send credentials if provided
    if (accessCode) body.accessCode = accessCode;
    if (linkCode) body.linkCode = linkCode;

    try {
      const url = mode.kind === 'edit' ? `/api/admin/games/${mode.gameId}` : '/api/admin/games';
      const method = mode.kind === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Save failed');
      }

      onsave();
      onclose();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Save failed';
      status = 'idle';
    }
  }

  async function handleDelete() {
    if (mode.kind !== 'edit') return;

    if (status !== 'confirm-delete') {
      status = 'confirm-delete';
      return;
    }

    status = 'saving';
    errorMessage = '';

    try {
      const res = await fetch(`/api/admin/games/${mode.gameId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Delete failed');
      }
      onsave();
      onclose();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Delete failed';
      status = 'idle';
    }
  }
</script>

<Modal {open} {onclose} title={isEdit ? `Edit Game` : 'Add Game'} size="md">
  {#snippet content()}
    <div class="form">
      {#if errorMessage}
        <div class="error-banner">{errorMessage}</div>
      {/if}

      <!-- Roblox lookup -->
      <fieldset class="field-group">
        <label class="field-label" for="gf-roblox-url">Roblox URL Lookup</label>
        <div class="lookup-row">
          <Input
            id="gf-roblox-url"
            value={robloxUrl}
            placeholder="https://www.roblox.com/games/12345/..."
            type="url"
            oninput={(e) => (robloxUrl = inputValue(e))}
            disabled={status === 'looking-up'}
          />
          <Button
            variant="secondary"
            onclick={handleLookup}
            disabled={!robloxUrl || status === 'looking-up'}
          >
            {status === 'looking-up' ? 'Looking up...' : 'Lookup'}
          </Button>
        </div>
      </fieldset>

      <!-- Title + Slug -->
      <div class="field-row">
        <fieldset class="field-group">
          <label class="field-label" for="gf-title">Title *</label>
          <Input
            id="gf-title"
            value={title}
            placeholder="Game title"
            oninput={(e) => {
              title = inputValue(e);
              if (!slugManuallyEdited) slug = slugify(title);
            }}
          />
        </fieldset>
        <fieldset class="field-group">
          <label class="field-label" for="gf-slug">Slug *</label>
          <Input
            id="gf-slug"
            value={slug}
            placeholder="game-slug"
            disabled={isEdit}
            oninput={(e) => {
              slug = inputValue(e);
              slugManuallyEdited = true;
            }}
          />
        </fieldset>
      </div>

      <!-- Type + Category -->
      <div class="field-row">
        <fieldset class="field-group">
          <label class="field-label" for="gf-type">Type *</label>
          <Select id="gf-type" options={typeOptions} bind:value={type} />
        </fieldset>
        <fieldset class="field-group">
          <label class="field-label" for="gf-category">Category *</label>
          <Select id="gf-category" options={categoryOptions} bind:value={engagementCategory} />
        </fieldset>
      </div>

      <!-- Launch URL -->
      <fieldset class="field-group">
        <label class="field-label" for="gf-launch-url">Launch URL *</label>
        <Input
          id="gf-launch-url"
          value={launchUrl}
          placeholder="https://www.roblox.com/games/..."
          type="url"
          oninput={(e) => (launchUrl = inputValue(e))}
        />
      </fieldset>

      <!-- Description -->
      <fieldset class="field-group">
        <label class="field-label" for="gf-description">Description</label>
        <Textarea
          id="gf-description"
          value={description}
          placeholder="Short description for the game card"
          rows={3}
          oninput={(e) => (description = inputValue(e))}
        />
      </fieldset>

      <!-- Thumbnail URL -->
      <fieldset class="field-group">
        <label class="field-label" for="gf-thumbnail">Thumbnail URL</label>
        <Input
          id="gf-thumbnail"
          value={thumbnailUrl}
          placeholder="https://..."
          type="url"
          oninput={(e) => (thumbnailUrl = inputValue(e))}
        />
        {#if thumbnailUrl}
          <img class="thumbnail-preview" src={thumbnailUrl} alt="Thumbnail preview" />
        {/if}
      </fieldset>

      <!-- Place ID -->
      <fieldset class="field-group">
        <label class="field-label" for="gf-place-id">Place ID</label>
        <Input
          id="gf-place-id"
          value={placeId}
          placeholder="Roblox place ID"
          oninput={(e) => (placeId = inputValue(e))}
        />
      </fieldset>

      <!-- Private Server Credentials (Roblox only) -->
      {#if isRoblox}
        <div class="credentials-section">
          <h4 class="credentials-title">
            <Icon name="lock" size={14} />
            Private Server Credentials
          </h4>
          {#if isEdit}
            <p class="credentials-hint">Leave blank to keep existing credentials.</p>
          {/if}
          <div class="field-row">
            <fieldset class="field-group">
              <label class="field-label" for="gf-access-code">Access Code</label>
              <Input
                id="gf-access-code"
                value={accessCode}
                placeholder={isEdit ? 'Unchanged' : 'Private server access code'}
                oninput={(e) => (accessCode = inputValue(e))}
              />
            </fieldset>
            <fieldset class="field-group">
              <label class="field-label" for="gf-link-code">Link Code</label>
              <Input
                id="gf-link-code"
                value={linkCode}
                placeholder={isEdit ? 'Unchanged' : 'Private server link code'}
                oninput={(e) => (linkCode = inputValue(e))}
              />
            </fieldset>
          </div>
          <p class="credentials-note">
            <Icon name="info" size={14} />
            Roblox games require private server credentials to launch.
          </p>
        </div>
      {/if}

      <!-- Active toggle -->
      <fieldset class="field-group toggle-field">
        <label class="field-label" for="gf-active">Active</label>
        <Toggle checked={isActive} onchange={() => (isActive = !isActive)} label="Game is active" />
        {#if showCredentialsWarning}
          <span class="active-warning">
            <Icon name="info" size={14} />
            This game has no private server credentials and will not launch.
          </span>
        {/if}
      </fieldset>
    </div>
  {/snippet}

  {#snippet footer()}
    {#if status === 'confirm-delete'}
      <span class="delete-confirm-text">Delete this game?</span>
      <Button variant="secondary" onclick={() => (status = 'idle')}>Cancel</Button>
      <Button variant="primary" onclick={handleDelete}>Delete</Button>
    {:else}
      {#if isEdit}
        <Button variant="danger" size="sm" onclick={handleDelete}>
          <Icon name="trash" size={16} />
          Delete
        </Button>
      {/if}
      <div class="footer-spacer"></div>
      <Button variant="secondary" onclick={onclose} disabled={status === 'saving'}>Cancel</Button>
      <Button variant="primary" onclick={handleSave} disabled={!canSave}>
        {status === 'saving' ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Game'}
      </Button>
    {/if}
  {/snippet}
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border: none;
    padding: 0;
    margin: 0;
  }

  .field-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .field-row {
    display: flex;
    gap: var(--space-4);
  }

  .field-row .field-group {
    flex: 1;
  }

  .thumbnail-preview {
    max-width: 160px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
  }

  .lookup-row {
    display: flex;
    gap: var(--space-3);
    align-items: stretch;
  }

  .lookup-row :global(.input) {
    flex: 1;
  }

  .lookup-row :global(.btn) {
    white-space: nowrap;
  }

  .toggle-field {
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }

  .credentials-section {
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius-zero);
    padding: var(--space-4);
    background: var(--color-bg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .credentials-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .credentials-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  .credentials-note {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-accent);
    margin: 0;
  }

  .active-warning {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-error);
  }

  .error-banner {
    padding: var(--space-3);
    background: var(--color-error);
    color: white;
    font-size: var(--font-size-sm);
    font-weight: 600;
    border-radius: var(--radius-zero);
  }

  .delete-confirm-text {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-error);
    margin-right: auto;
  }

  .footer-spacer {
    flex: 1;
  }
</style>
