<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import { Steps } from '@skeletonlabs/skeleton-svelte';
	import type { Step } from '$lib/models/step';
	import type { Component, Snippet } from 'svelte';
	import Generate from './steps/generate.svelte';
	import Paint from './steps/paint.svelte';
	import Tweak from './steps/tweak.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { tool_pairs } from '$lib/models/tool';
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
				'Click Generate to randomize the whole galaxy. Play with the settings below, or leave them be for a relatively "standard" galaxy. When you\'re satisfied, click Next.',
		},
		{
			id: 'tweak',
			name: 'Tweak',
			content: Tweak,
			description: tweak_description,
		},
	];

	const editor = $derived(get_editor()());

	function handle_download() {
		const galaxy_txt = generate_stellaris_galaxy(editor.project);
		const blob = new Blob([galaxy_txt], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${editor.project.name}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

{#snippet tweak_description()}
	Here you can optionally edit specific stars, hyperlanes, and more. When you're
	done, click Download and follow the instructions on <a
		class="anchor text-primary-700-300"
		target="_blank"
		href="https://steamcommunity.com/sharedfiles/filedetails/?id=3532904115"
	>
		the Workshop page.
	</a>
{/snippet}

<aside class="w-96 p-4 flex-none">
	<Steps
		class="flex flex-col h-full"
		count={steps.length}
		step={steps.findIndex((step) => step.id === editor?.step)}
		onStepChange={(details) => {
			const step = steps[details.step]?.id;
			if (step) {
				editor.step = step;
				// select first tool for step
				const tool_pair = Object.values(tool_pairs).find(
					(pair) => pair.step === step,
				);
				if (tool_pair) {
					editor.primary_tool_id = tool_pair.primary.id;
					editor.secondary_tool_id = tool_pair.secondary.id;
				}
			}
		}}
	>
		<Steps.List>
			{#each steps as step, i (step.id)}
				<Steps.Item index={i}>
					<Steps.Trigger>
						<Steps.Indicator>{i + 1}</Steps.Indicator>
						{step.name}
					</Steps.Trigger>
					{#if i < steps.length - 1}
						<Steps.Separator />
					{/if}
				</Steps.Item>
			{/each}
		</Steps.List>

		{#each steps as step, i (step.id)}
			<Steps.Content index={i} class="grow flex flex-col gap-4">
				<p>
					{#if typeof step.description === 'string'}{step.description}{:else}{@render step.description()}{/if}
				</p>
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
