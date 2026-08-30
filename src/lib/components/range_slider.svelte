<script lang="ts">
	import { Slider } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		value: [number, number];
		on_value_change: (value: [number, number]) => void;
		min: number;
		max: number;
		step: number;
		label: Snippet<[]>;
		output?: Snippet<[[number, number]]>;
	};
	let { value, on_value_change, min, max, step, label, output }: Props =
		$props();
</script>

<Slider
	{min}
	{max}
	{step}
	{value}
	onValueChange={(details) => {
		if (details.value[0] != null && details.value[1] != null) {
			on_value_change([details.value[0], details.value[1]]);
		}
	}}
>
	<Slider.Label class="flex justify-between">
		<span class="flex gap-1">{@render label()}</span>
		<span class="font-normal">
			{#if output}
				{@render output(value)}
			{:else}
				{value[0]} – {value[1]}
			{/if}
		</span>
	</Slider.Label>
	<Slider.Control>
		<Slider.Track class="cursor-pointer bg-surface-200-800">
			<Slider.Range class="bg-primary-500" />
		</Slider.Track>
		<Slider.Thumb index={0} class="cursor-pointer bg-primary-500">
			<Slider.HiddenInput />
		</Slider.Thumb>
		<Slider.Thumb index={1} class="cursor-pointer bg-primary-500">
			<Slider.HiddenInput />
		</Slider.Thumb>
	</Slider.Control>
</Slider>
