<script lang="ts">
	import { debounced_value } from '$lib/attachments/debounced_value.svelte';
	import { Icons } from '$lib/components/icons';
	import Info from '$lib/components/info.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';

	import {
		get_reserved_spawn_label,
		RESERVED_SPAWN_TYPES,
	} from '$lib/models/reserved_spawn';
	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { FloatingPanel, Portal, Switch } from '@skeletonlabs/skeleton-svelte';
	import { Option, pipe } from 'effect';
	import InitializerCombobox from './initializer_combobox.svelte';
	import {
		initializer_metadata,
		type InitializerKey,
	} from '$lib/data/initializer_metadata';

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

	const initializer_name = $derived(
		pipe(
			solar_system,
			Option.flatMap((value) => value.resolve_initializer()),
			Option.flatMapNullable((value) =>
				value in initializer_metadata ?
					initializer_metadata[value as InitializerKey]
				:	null,
			),
			Option.flatMapNullable((value) => value.name),
		),
	);

	const reserved_spawn_options = RESERVED_SPAWN_TYPES.map((spawn_type) => ({
		value: spawn_type,
		label: `Reserved ${get_reserved_spawn_label(spawn_type)}`,
	}));
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
						<Switch
							checked={solar_system.value.locked}
							onCheckedChange={(details) =>
								editor().apply_actions([
									new Action.UpdateSolarSystemAction({
										old_value: solar_system.value,
										new_value: new SolarSystem({
											...solar_system.value,
											locked: details.checked,
										}),
									}),
								])}
						>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							<Switch.Label class="flex gap-1">
								{solar_system.value.locked ? 'Locked' : 'Unlocked'}
								<Info>
									If locked, this system can't be edited by Tweak tools or
									randomly generating a map.
								</Info>
							</Switch.Label>
							<Switch.HiddenInput />
						</Switch>
						<label>
							<span class="label-text">Name</span>
							<input
								class="input ring-surface-300-700 bg-surface-200-800"
								placeholder="Random"
								disabled={Option.isSome(initializer_name) ||
									solar_system.value.locked}
								{@attach debounced_value(
									() =>
										solar_system.value
											.resolve_name()
											.pipe(Option.getOrElse(() => '')),
									(value) => {
										const name: Option.Option<string> =
											value === '' ? Option.none() : Option.some(value);
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
							<span class="label-text flex gap-1">
								Spawn
								<Info>
									<dl class="flex flex-col gap-1">
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">Disabled</dt>
											<dd class="inline">Empires will not spawn here.</dd>
										</div>
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">Enabled</dt>
											<dd class="inline">Empires can spawn here.</dd>
										</div>
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">1st Player</dt>
											<dd class="inline">
												The 1st player will spawn here. AI empires (and other
												players in multiplayer) will never spawn here. Use <em>
													Reserved
												</em>
												spawns if you want to control the location of other AIs or
												other players.
											</dd>
										</div>
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">Reserved</dt>
											<dd class="inline">
												Empires will only spawn here if they have the matching
												species trait (eg Reserved Spawn A) from the Reserved
												Spawns submod. This can be used to precisely control the
												locations of players and custom-designed AI.
											</dd>
										</div>
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">Reserved Sol</dt>
											<dd class="inline">
												Like Reserved, but additionally the UNE will be treated
												as if they had the Reserved Spawn Sol trait. Unless
												you're using a modded Sol system, don't set this
												manually. Instead, set the initializer to Sol.
											</dd>
										</div>
									</dl>
								</Info>
							</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={solar_system.value.spawn_type}
								disabled={solar_system.value.locked}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateSolarSystemAction({
											old_value: solar_system.value,
											new_value: new SolarSystem({
												...solar_system.value,
												spawn_type: e.currentTarget
													.value as SolarSystem['spawn_type'],
											}),
										}),
									])}
							>
								<option value="disabled">Disabled</option>
								<option value="enabled">Enabled</option>
								<option value="preferred">1st Player</option>
								{#each reserved_spawn_options as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
						<InitializerCombobox
							solar_system={solar_system.value}
							disabled={solar_system.value.locked}
						/>
					{/if}
				</FloatingPanel.Body>
				<FloatingPanel.ResizeTrigger axis="se" />
			</FloatingPanel.Content>
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel>
