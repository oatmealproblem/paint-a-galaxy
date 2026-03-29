<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import { Steps } from '@skeletonlabs/skeleton-svelte';
	import type { Step } from '$lib/models/step';
	import type { Component, Snippet } from 'svelte';
	import Generate from './steps/generate.svelte';
	import Paint from './steps/paint.svelte';
	import Tweak from './steps/tweak.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { generate_stellaris_galaxy } from '$lib/generate_galaxy_txt';

	const steps: {
		id: Step;
		name: string;
		description: string | Snippet;
		content: Component;
	}[] = [
		{
			id: 'paint',
			name: 'Paint',
			content: Paint,
			description:
				"Paint the general shapes were you want stars to spawn. The brighter you paint, the more stars will spawn there. When you're ready, click Next.",
		},
		{
			id: 'generate',
			name: 'Generate',
			content: Generate,
			description:
				"Randomize the galaxy according to your painting. Optionally play with the settings and regenerate. When you're satisfied, click Next.",
		},
		{
			id: 'tweak',
			name: 'Tweak',
			content: Tweak,
			description: tweak_description,
		},
	];

	const editor = get_editor();

	function handle_download() {
		const galaxy_txt = generate_stellaris_galaxy(editor().project);
		const blob = new Blob([galaxy_txt], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${editor().project.name}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

{#snippet tweak_description()}
	<p>
		Manually edit using the tools below, or right-click the map for more. Then
		click Download and follow <a
			class="anchor text-primary-700-300"
			target="_blank"
			href="https://steamcommunity.com/sharedfiles/filedetails/?id=3532904115"
		>
			the instructions on the Workshop.
		</a>
	</p>
{/snippet}

<aside class="w-96 p-4 flex-none overflow-auto">
	<Steps
		class="flex flex-col h-full"
		count={steps.length}
		step={steps.findIndex((step) => step.id === editor()?.step)}
		onStepChange={(details) => {
			const step = steps[details.step]?.id;
			if (step) {
				editor().set_step(step);
			}
		}}
	>
		<Steps.List>
			{#each steps as step, i (step.id)}
				<Steps.Item index={i}>
					<Steps.Trigger>
						<Steps.Indicator
							class="border-surface-300-700 data-complete:border-primary-500 data-current:border-primary-500 data-current:border-2"
						>
							{i + 1}
						</Steps.Indicator>
						{step.name}
					</Steps.Trigger>
					{#if i < steps.length - 1}
						<Steps.Separator
							class="border-surface-300-700 data-complete:border-primary-500 data-complete:border-1"
						/>
					{/if}
				</Steps.Item>
			{/each}
		</Steps.List>

		{#each steps as step, i (step.id)}
			<Steps.Content index={i} class="grow flex flex-col gap-4">
				<div class="text-sm text-surface-900-100 flex flex-col gap-2">
					{#if typeof step.description === 'string'}{step.description}{:else}{@render step.description()}{/if}
				</div>
				<step.content />
			</Steps.Content>
		{/each}

		<div class="flex justify-between">
			<Steps.Context>
				{#snippet children(context)}
					<Steps.PrevTrigger class="btn preset-outlined-primary-500 ps-3">
						<Icons.ArrowLeft size={18} />
						Back
					</Steps.PrevTrigger>
					{#if context().value === steps.length - 1}
						<button
							class="btn preset-filled-primary-500"
							onclick={handle_download}
						>
							<Icons.Download size={18} />
							Download
						</button>
					{:else}
						<Steps.NextTrigger class="btn preset-filled-primary-500 pe-3ps-3">
							Next
							<Icons.ArrowRight size={18} />
						</Steps.NextTrigger>
					{/if}
				{/snippet}
			</Steps.Context>
		</div>
	</Steps>
</aside>
