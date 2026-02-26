<script lang="ts">
	import { Slider } from '@skeletonlabs/skeleton-svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		value: number;
		on_value_change: (value: number) => void;
		min: number;
		max: number;
		step: number;
		label: Snippet<[]>;
		output?: Snippet<[number]>;
	};
	let { value, on_value_change, min, max, step, label, output }: Props =
		$props();
</script>

<Slider
	{min}
	{max}
	{step}
	value={[value]}
	onValueChange={(details) => {
		if (details.value[0] != null) {
			on_value_change(details.value[0]);
		}
	}}
>
	<Slider.Label class="flex justify-between">
		<span>{@render label()}</span>
		<span class="font-normal">
			{#if output}
				{@render output(value)}
			{:else}
				{value}
			{/if}
		</span>
	</Slider.Label>
	<Slider.Control>
		<Slider.Track>
			<Slider.Range />
		</Slider.Track>
		<Slider.Thumb index={0} class="cursor-pointer">
			<Slider.HiddenInput />
		</Slider.Thumb>
	</Slider.Control>
</Slider>
