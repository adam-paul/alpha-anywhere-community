<script lang="ts">
  import { INTERESTS } from '$lib/constants';
  import type { Interest } from '$lib/types';
  import { Badge } from '$lib/components/ui';

  interface Props {
    interest: Interest;
  }

  let { interest }: Props = $props();

  const meta = $derived(INTERESTS[interest]);
</script>

<Badge color={meta.color} background="transparent">
  {meta.label}
</Badge>
