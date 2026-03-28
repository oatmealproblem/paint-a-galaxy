<script lang="ts">
	import { debounced_value } from '$lib/attachments/debounced_value.svelte';
	import { Icons } from '$lib/components/icons';
	import Info from '$lib/components/info.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';

	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { FloatingPanel, Portal } from '@skeletonlabs/skeleton-svelte';
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
			Option.flatMap((value) => value.initializer),
			Option.flatMapNullable((value) =>
				value in initializer_metadata ?
					initializer_metadata[value as InitializerKey]
				:	null,
			),
			Option.flatMapNullable((value) => value.name),
		),
	);
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
								disabled={Option.isSome(initializer_name)}
								{@attach debounced_value(
									() =>
										solar_system.value
											.get_name()
											.pipe(Option.getOrElse(() => '')),
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
											<dt class="font-bold inline">Preferred</dt>
											<dd class="inline">
												Empires will spawn here before using normal <em>
													Enabled
												</em>
												locations. In single player, the player is first, so if there's
												only one
												<em>Preferred</em>
												location, they will start there.
											</dd>
										</div>
										<div class="ms-4 -indent-4">
											<dt class="font-bold inline">Reserved</dt>
											<dd class="inline">
												Empires will only spawn here if they have the matching
												species trait (eg Reserved Spawn A). This can be used to
												precisely control the locations of all players and
												custom-designed AI empires.
											</dd>
										</div>
									</dl>
								</Info>
							</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={solar_system.value.spawn_type}
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
								<option value="preferred">Preferred</option>
								<option value="reserved_a">Reserved A</option>
								<option value="reserved_b">Reserved B</option>
								<option value="reserved_c">Reserved C</option>
								<option value="reserved_d">Reserved D</option>
								<option value="reserved_e">Reserved E</option>
								<option value="reserved_f">Reserved F</option>
								<option value="reserved_g">Reserved G</option>
								<option value="reserved_h">Reserved H</option>
								<option value="reserved_i">Reserved I</option>
								<option value="reserved_j">Reserved J</option>
								<option value="reserved_k">Reserved K</option>
								<option value="reserved_l">Reserved L</option>
								<option value="reserved_m">Reserved M</option>
								<option value="reserved_n">Reserved N</option>
								<option value="reserved_o">Reserved O</option>
								<option value="reserved_p">Reserved P</option>
								<option value="reserved_q">Reserved Q</option>
								<option value="reserved_r">Reserved R</option>
								<option value="reserved_s">Reserved S</option>
								<option value="reserved_t">Reserved T</option>
								<option value="reserved_u">Reserved U</option>
								<option value="reserved_v">Reserved V</option>
								<option value="reserved_w">Reserved W</option>
								<option value="reserved_x">Reserved X</option>
								<option value="reserved_y">Reserved Y</option>
								<option value="reserved_z">Reserved Z</option>
							</select>
						</label>
						<InitializerCombobox solar_system={solar_system.value} />
					{/if}
				</FloatingPanel.Body>
				<FloatingPanel.ResizeTrigger axis="se" />
			</FloatingPanel.Content>
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel>
