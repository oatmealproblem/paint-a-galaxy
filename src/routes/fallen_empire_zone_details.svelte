<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import Info from '$lib/components/info.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';
	import { FallenEmpireZone } from '$lib/models/fallen_empire_zone';
	import { FloatingPanel, Portal, Switch } from '@skeletonlabs/skeleton-svelte';
	import { Option } from 'effect';

	type Props = {
		position: { x: number; y: number };
		size: { width: number; height: number };
		on_close_requested: () => void;
		zone: Option.Option<FallenEmpireZone>;
	};
	let {
		on_close_requested,
		zone,
		position = $bindable(),
		size = $bindable(),
	}: Props = $props();

	const editor = get_editor();

	$effect(() => {
		if (Option.isNone(zone)) on_close_requested();
	});

	const FALLEN_EMPIRE_TYPES = [
		'random',
		'materialist',
		'spiritualist',
		'xenophobe',
		'xenophile',
		'machine',
		'hive',
	] as const;
</script>

<FloatingPanel
	open={Option.isSome(zone)}
	onOpenChange={(details) => {
		if (!details.open) on_close_requested();
	}}
	{size}
	onSizeChange={(details) => {
		size = details.size;
	}}
	{position}
	onPositionChange={(details) => {
		position = details.position;
	}}
>
	<Portal>
		<FloatingPanel.Positioner class="z-50">
			<FloatingPanel.Content
				class="flex flex-col flex-nowrap border-primary-500"
			>
				<FloatingPanel.DragTrigger>
					<FloatingPanel.Header>
						<FloatingPanel.Title>
							<Icons.GripVertical class="size-4" />
							Fallen Empire Zone
						</FloatingPanel.Title>
						<FloatingPanel.Control>
							<FloatingPanel.StageTrigger stage="minimized">
								<Icons.Minus class="size-4" />
							</FloatingPanel.StageTrigger>
							<FloatingPanel.StageTrigger stage="default">
								<Icons.Square class="size-4" />
							</FloatingPanel.StageTrigger>
							<FloatingPanel.CloseTrigger>
								<Icons.X class="size-4" />
							</FloatingPanel.CloseTrigger>
						</FloatingPanel.Control>
					</FloatingPanel.Header>
				</FloatingPanel.DragTrigger>
				<FloatingPanel.Body class="flex flex-col gap-2">
					{#if Option.isSome(zone)}
						<label>
							<span class="label-text">Type</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={zone.value.type}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateFallenEmpireZoneAction({
											old_value: zone.value,
											new_value: new FallenEmpireZone({
												...zone.value,
												type: e.currentTarget.value as FallenEmpireZone['type'],
											}),
										}),
									])}
							>
								{#each FALLEN_EMPIRE_TYPES as fe_type (fe_type)}
									<option value={fe_type}>
										{fe_type.charAt(0).toUpperCase() + fe_type.slice(1)}
									</option>
								{/each}
							</select>
						</label>
						<Switch
							checked={zone.value.fallback_to_random}
							onCheckedChange={(details) =>
								editor().apply_actions([
									new Action.UpdateFallenEmpireZoneAction({
										old_value: zone.value,
										new_value: new FallenEmpireZone({
											...zone.value,
											fallback_to_random: details.checked,
										}),
									}),
								])}
						>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Switch.Label class="flex gap-1">
								Generate Random Systems if Unused
								<Info>
									If checked, if this Fallen Empire zone is not used, a cluster
									of random solar systems will be generated here.
								</Info>
							</Switch.Label>
							<Switch.HiddenInput />
						</Switch>
						<div>
							<dl>
								<div class="flex items-baseline gap-2">
									<dt class="label-text">Connections:</dt>
									<dd>
										{zone.value.connections.length === 0 ?
											'Random'
										:	zone.value.connections.length}
									</dd>
								</div>
							</dl>
							<span class="text-surface-800-200">
								Right-click solar systems on the map to manage their connections
								to Fallen Empire zones. If you do not set any connections, they
								will be randomly generated.
							</span>
						</div>
					{/if}
				</FloatingPanel.Body>
				<FloatingPanel.ResizeTrigger axis="se" />
			</FloatingPanel.Content>
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel>
