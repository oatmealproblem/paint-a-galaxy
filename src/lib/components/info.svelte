<script lang="ts">
	import { Portal, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { Icons } from './icons';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<Tooltip positioning={{ placement: 'top' }}>
	<Tooltip.Trigger class="cursor-help">
		<Icons.Info class="text-secondary-800-200" size={16} />
	</Tooltip.Trigger>
	<Portal>
		<Tooltip.Positioner class="z-100!">
			<Tooltip.Content
				class="card p-2 preset-filled-surface-950-50 text-sm max-w-xs"
			>
				{@render children()}
				<Tooltip.Arrow
					class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-950-50)]"
				>
					<Tooltip.ArrowTip />
				</Tooltip.Arrow>
			</Tooltip.Content>
		</Tooltip.Positioner>
	</Portal>
</Tooltip>
