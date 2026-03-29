<script lang="ts">
	import type { Step } from '$lib/models/step';
	import {
		CAP_STYLE,
		tool_pairs,
		ToolId,
		ToolSettingId,
		type Tool,
	} from '$lib/models/tool';
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

	function on_value_change(tool_id: ToolId, setting: ToolSettingId) {
		return (value: number) => {
			editor().update_tool_settings(tool_id, {
				...editor().tool_settings[tool_id],
				[setting]: value,
			});
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
	<SegmentedControl.Control class="border-surface-300-700">
		<SegmentedControl.Indicator class="bg-primary-500" />
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
									<Icon class="size-4 text-surface-950-50" />
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

{#snippet settings(tool: Tool)}
	<header class="flex gap-2 items-baseline">
		<h3 class="inline font-bold text-surface-900-100">{tool.name}</h3>
		<em class="text-sm text-surface-800-200">
			{#if tool.id === editor().secondary_tool_id}shift+{/if}click{#if tool.action_type !== 'single_point'}+drag{/if}
		</em>
		<div class="grow"></div>
		<Tooltip positioning={{ placement: 'top' }}>
			<Tooltip.Trigger
				class="btn btn-icon p-0 size-5 relative top-2 text-tertiary-700-300"
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
					class="btn btn-icon p-0 size-5 relative top-2 text-tertiary-700-300"
					onclick={() => {
						editor().update_tool_settings(tool.id, {
							...editor().tool_settings[tool.id],
							...tool.default_settings,
						});
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
		<p class="text-sm text-surface-900-100">{tool.description}</p>
	{/if}

	{#if 'cap_style' in tool.default_settings}
		<label>
			<span class="label-text">Cap Style</span>
			<select
				class="select ring-surface-300-700 bg-surface-100-900"
				value={editor().tool_settings[tool.id].cap_style}
				onchange={(e) =>
					on_value_change(
						tool.id,
						'cap_style',
					)(Number.parseInt(e.currentTarget.value))}
			>
				<option value={CAP_STYLE.butt}>Butt</option>
				<option value={CAP_STYLE.bevel}>Bevel</option>
				<option value={CAP_STYLE.round}>Round</option>
			</select>
		</label>
	{/if}

	{#if 'size' in tool.default_settings}
		<Slider
			min={0}
			max={500}
			step={1}
			value={editor().tool_settings[tool.id].size}
			on_value_change={on_value_change(tool.id, 'size')}
		>
			{#snippet label()}{tool.size_label ?? 'Size'}{/snippet}
		</Slider>
	{/if}

	{#if 'opacity' in tool.default_settings}
		<Slider
			min={0}
			max={1}
			step={0.01}
			value={editor().tool_settings[tool.id].opacity}
			on_value_change={on_value_change(tool.id, 'opacity')}
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
			value={editor().tool_settings[tool.id].blur}
			on_value_change={on_value_change(tool.id, 'blur')}
		>
			{#snippet label()}Blur{/snippet}
			{#snippet output(value)}{value}x{/snippet}
		</Slider>
	{/if}
{/snippet}

<SectionHeader>Primary</SectionHeader>
{@render settings(editor().primary_tool)}

<SectionHeader>Secondary</SectionHeader>
{@render settings(editor().secondary_tool)}
