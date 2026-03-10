<script lang="ts">
	import { debounced_value } from '$lib/attachments/debounced_value.svelte';
	import { Icons } from '$lib/components/icons';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';

	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { FloatingPanel, Portal } from '@skeletonlabs/skeleton-svelte';
	import { Option } from 'effect';

	type Props = {
		position: { x: number; y: number };
		size: { width: number; height: number };
		on_close_requested: () => void;
		solar_system_id: Option.Option<SolarSystemId>;
	};
	let {
		on_close_requested,
		solar_system_id,
		position = $bindable(),
		size = $bindable(),
	}: Props = $props();

	const editor = get_editor();
	const solar_system = $derived(
		Option.flatMap(solar_system_id, (value) =>
			editor().project.get_solar_system(value),
		),
	);

	// close the details if the solar system ever
	$effect(() => {
		if (Option.isNone(solar_system)) on_close_requested();
	});
</script>

<FloatingPanel
	open={Option.isSome(solar_system_id)}
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
							Solar System Details
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
					{#if Option.isSome(solar_system)}
						{@const coordinate =
							solar_system.value.coordinate.to_stellaris_coordinate()}
						<dl>
							<div class="flex items-baseline gap-2">
								<dt class="label-text">ID:</dt>
								<dd>
									{solar_system.value.id}
								</dd>
							</div>
							<div class="flex items-baseline gap-2">
								<dt class="label-text">Coordinate:</dt>
								<dd>
									{coordinate.x}, {coordinate.y}
								</dd>
							</div>
						</dl>
						<label>
							<span class="label-text">Name</span>
							<input
								class="input ring-surface-300-700 bg-surface-200-800"
								placeholder="Random"
								{@attach debounced_value(
									() => Option.getOrElse(solar_system.value.name, () => ''),
									(value) => {
										const name: Option.Option<string> =
											value == '' ? Option.none() : Option.some(value);
										editor().apply_actions([
											new Action.UpdateSolarSystemAction({
												old_value: solar_system.value,
												new_value: new SolarSystem({
													...solar_system.value,
													name,
												}),
											}),
										]);
									},
									500,
								)}
							/>
						</label>
						<label>
							<span class="label-text">Spawn</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={solar_system.value.spawn_type}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateSolarSystemAction({
											old_value: solar_system.value,
											new_value: new SolarSystem({
												...solar_system.value,
												spawn_type: e.currentTarget.value as
													| 'disabled'
													| 'enabled'
													| 'preferred',
											}),
										}),
									])}
							>
								<option value="disabled">Disabled</option>
								<option value="enabled">Enabled</option>
								<option value="preferred">Preferred</option>
							</select>
						</label>
					{/if}
				</FloatingPanel.Body>
				<FloatingPanel.ResizeTrigger axis="se" />
			</FloatingPanel.Content>
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel>
