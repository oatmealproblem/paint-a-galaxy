<script lang="ts">
	import Info from './info.svelte';
	import { Icons } from './icons';
	import { get_editor } from '$lib/editor.svelte';
	import type { FallenEmpireZoneId } from '$lib/models/fallen_empire_zone';
	import type { SolarSystemId } from '$lib/models/solar_system';
	import { type Snippet } from 'svelte';

	const editor = get_editor();

	type Props = {
		label: string;
		value?: number;
		detail?: Snippet;
		info?: Snippet;
		warning?: boolean;
		solar_system_ids?: SolarSystemId[];
		fallen_empire_zone_ids?: FallenEmpireZoneId[];
	};

	const {
		label,
		value,
		detail,
		info,
		warning = false,
		solar_system_ids = [],
		fallen_empire_zone_ids = [],
	}: Props = $props();

	const has_highlights = $derived(
		solar_system_ids.length > 0 || fallen_empire_zone_ids.length > 0,
	);

	let highlighted = $state(false);

	function highlight() {
		highlighted = true;
		editor().warned_solar_system_ids = solar_system_ids;
		editor().warned_fallen_empire_zone_ids = fallen_empire_zone_ids;
	}

	function unhighlight() {
		if (highlighted) {
			highlighted = false;
			editor().warned_solar_system_ids = [];
			editor().warned_fallen_empire_zone_ids = [];
		}
	}

	$effect(() => {
		if (highlighted) {
			editor().warned_solar_system_ids = solar_system_ids;
			editor().warned_fallen_empire_zone_ids = fallen_empire_zone_ids;
		}
		return () => {
			editor().warned_solar_system_ids = [];
			editor().warned_fallen_empire_zone_ids = [];
		};
	});
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<tr
	class={{ 'preset-filled-warning-500': warning }}
	onmouseover={has_highlights ? highlight : undefined}
	onmouseout={has_highlights ? unhighlight : undefined}
>
	<td class="align-top">
		{#if warning}
			<Icons.TriangleAlert class="text-warning-50-950 inline" />
		{/if}
		{label}
		{#if info}
			<Info
				class={`${
					warning ? 'text-warning-50-950' : 'text-secondary-800-200'
				} relative top-0.5`}
			>
				{@render info()}
			</Info>
		{/if}
	</td>
	<td class="text-end">
		{#if detail}
			{@render detail()}
		{:else}
			{value}
		{/if}
	</td>
</tr>
