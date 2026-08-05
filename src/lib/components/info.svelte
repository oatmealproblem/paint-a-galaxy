<script lang="ts">
	import { Portal, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { Icons } from './icons';
	import type { Snippet } from 'svelte';

	const {
		children,
		class: class_ = 'text-secondary-800-200',
	}: { children: Snippet; class?: string } = $props();
</script>

<!-- note: styles here intentionally do not use light/dark color pairs -->
<Tooltip positioning={{ placement: 'top' }}>
	<Tooltip.Trigger class={['cursor-help', class_]}>
		<Icons.Info size={16} />
	</Tooltip.Trigger>
	<Portal>
		<Tooltip.Positioner class="z-100!">
			<Tooltip.Content
				class="card p-2 bg-surface-50 text-surface-950 text-sm max-w-xs shadow-sm shadow-black/50"
			>
				{@render children()}
				<Tooltip.Arrow
					class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-50)]"
				>
					<Tooltip.ArrowTip />
				</Tooltip.Arrow>
			</Tooltip.Content>
		</Tooltip.Positioner>
	</Portal>
</Tooltip>
