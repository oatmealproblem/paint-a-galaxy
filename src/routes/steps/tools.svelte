<script lang="ts">
	import type { Step } from '$lib/models/step';
	import { tool_pairs, ToolSettingId, type Tool } from '$lib/models/tool';
	import { get_editor } from '$lib/editor.svelte';
	import Slider from '$lib/components/slider.svelte';
	import {
		Portal,
		SegmentedControl,
		Tooltip,
	} from '@skeletonlabs/skeleton-svelte';
	import { Icons } from '$lib/components/icons';
	import SectionHeader from '$lib/components/section_header.svelte';
	import { Record } from 'effect';

	type Props = {
		step: Step;
	};
	const { step }: Props = $props();

	const editor = get_editor();

	function on_value_change(
		setting: ToolSettingId,
		key: 'primary_tool_settings' | 'secondary_tool_settings',
	) {
		return (value: number) => {
			editor()[key] = {
				...editor()[key],
				[setting]: value,
			};
		};
	}
</script>

<SegmentedControl
	value={tool_pairs.find(
		(tool_pair) =>
			tool_pair.primary.id === editor().primary_tool_id ||
			tool_pair.secondary?.id === editor().primary_tool_id,
	)?.id}
	onValueChange={(details) => {
		const tool_pair = tool_pairs.find(
			(tool_pair) => tool_pair.id === details.value,
		);
		if (!tool_pair) return;
		editor().primary_tool_id = tool_pair.primary.id;
		editor().secondary_tool_id = tool_pair.secondary.id;
	}}
>
	<SegmentedControl.Label>Tool</SegmentedControl.Label>
	<SegmentedControl.Control>
		<SegmentedControl.Indicator />
		{#each tool_pairs.filter((tool_pair) => tool_pair.step === step) as tool_pair (tool_pair.id)}
			{@const Icon = Icons[tool_pair.icon]}
			<Tooltip positioning={{ placement: 'top' }}>
				<Tooltip.Trigger>
					{#snippet element(attributes: Record<string, unknown>)}
						<div {...attributes} class="flex-1 flex">
							<SegmentedControl.Item
								value={tool_pair.id}
								aria-label={tool_pair.name}
							>
								<SegmentedControl.ItemText>
									<Icon class="size-4" />
								</SegmentedControl.ItemText>
								<SegmentedControl.ItemHiddenInput />
							</SegmentedControl.Item>
						</div>
					{/snippet}
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card p-2 preset-filled-surface-950-50">
							<span>{tool_pair.name}</span>
							<Tooltip.Arrow
								class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-950-50)]"
							>
								<Tooltip.ArrowTip />
							</Tooltip.Arrow>
						</Tooltip.Content>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/each}
	</SegmentedControl.Control>
</SegmentedControl>

{#snippet settings(
	tool: Tool,
	key: 'primary_tool_settings' | 'secondary_tool_settings',
)}
	<header class="flex gap-2 items-baseline">
		<h3 class="inline font-bold">{tool.name}</h3>
		<em class="text-sm">
			{#if key === 'secondary_tool_settings'}shift+{/if}click{#if tool.action_type !== 'single_point'}+drag{/if}
		</em>
		<div class="grow"></div>
		<Tooltip positioning={{ placement: 'top' }}>
			<Tooltip.Trigger
				class="btn btn-icon p-0 size-5 relative top-2"
				onclick={() => {
					const primary = editor().secondary_tool_id;
					const secondary = editor().primary_tool_id;
					editor().primary_tool_id = primary;
					editor().secondary_tool_id = secondary;
				}}
			>
				<Icons.ArrowDownUp size={20} />
			</Tooltip.Trigger>
			<Portal>
				<Tooltip.Positioner>
					<Tooltip.Content class="card p-2 preset-filled-surface-950-50">
						<span>Swap Primary/Secondary</span>
						<Tooltip.Arrow
							class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-950-50)]"
						>
							<Tooltip.ArrowTip />
						</Tooltip.Arrow>
					</Tooltip.Content>
				</Tooltip.Positioner>
			</Portal>
		</Tooltip>
		{#if !Record.isEmptyRecord(tool.default_settings)}
			<Tooltip positioning={{ placement: 'top' }}>
				<Tooltip.Trigger
					class="btn btn-icon p-0 size-5 relative top-2"
					onclick={() => {
						editor()[key] = { ...editor()[key], ...tool.default_settings };
					}}
				>
					<Icons.RotateCcw size={20} />
				</Tooltip.Trigger>
				<Portal>
					<Tooltip.Positioner>
						<Tooltip.Content class="card p-2 preset-filled-surface-950-50">
							<span>Reset Settings</span>
							<Tooltip.Arrow
								class="[--arrow-size:--spacing(2)] [--arrow-background:var(--color-surface-950-50)]"
							>
								<Tooltip.ArrowTip />
							</Tooltip.Arrow>
						</Tooltip.Content>
					</Tooltip.Positioner>
				</Portal>
			</Tooltip>
		{/if}
	</header>

	{#if tool.description}
		<p class="text-sm">{tool.description}</p>
	{/if}

	{#if 'size' in tool.default_settings}
		<Slider
			min={0}
			max={100}
			step={1}
			value={editor()[key].size}
			on_value_change={on_value_change('size', key)}
		>
			{#snippet label()}Size{/snippet}
		</Slider>
	{/if}

	{#if 'opacity' in tool.default_settings}
		<Slider
			min={0}
			max={1}
			step={0.01}
			value={editor()[key].opacity}
			on_value_change={on_value_change('opacity', key)}
		>
			{#snippet label()}Strength{/snippet}
			{#snippet output(value)}{Math.round(value * 100)}%{/snippet}
		</Slider>
	{/if}

	{#if 'blur' in tool.default_settings}
		<Slider
			min={0}
			max={2}
			step={0.1}
			value={editor()[key].blur}
			on_value_change={on_value_change('blur', key)}
		>
			{#snippet label()}Blur{/snippet}
			{#snippet output(value)}{value}x{/snippet}
		</Slider>
	{/if}
{/snippet}

<SectionHeader>Primary</SectionHeader>
{@render settings(editor().primary_tool, 'primary_tool_settings')}

<SectionHeader>Secondary</SectionHeader>
{@render settings(editor().secondary_tool, 'secondary_tool_settings')}
