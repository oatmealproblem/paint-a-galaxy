<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';
	import { FallenEmpireZone } from '$lib/models/fallen_empire_zone';
	import { SolarSystemId } from '$lib/models/solar_system';
	import { FloatingPanel, Portal } from '@skeletonlabs/skeleton-svelte';
	import { Option } from 'effect';

	type Props = {
		position: { x: number; y: number };
		size: { width: number; height: number };
		on_close_requested: () => void;
		zone_origin: Option.Option<SolarSystemId>;
	};
	let {
		on_close_requested,
		zone_origin,
		position = $bindable(),
		size = $bindable(),
	}: Props = $props();

	const editor = get_editor();
	const zone = $derived(
		Option.flatMap(zone_origin, (origin) =>
			Option.fromNullable(
				editor().project.fallen_empire_zones.find((z) => z.origin === origin),
			),
		),
	);

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
	const DISTANCES = [30, 40, 50, 60, 70, 80, 90, 100] as const;
	const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

	let show_add_connection = $state(false);

	function get_zone_center(zone: FallenEmpireZone) {
		const origin = editor().project.get_solar_system(zone.origin);
		if (Option.isNone(origin)) return null;
		const angle_rad = (zone.angle * Math.PI) / 180;
		return {
			x: origin.value.coordinate.x + zone.distance * Math.cos(angle_rad),
			y: origin.value.coordinate.y + zone.distance * Math.sin(angle_rad),
		};
	}

	function get_direction_label(dx: number, dy: number): string {
		const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
		if (angle < 22.5 || angle >= 337.5) return 'E';
		if (angle < 67.5) return 'SE';
		if (angle < 112.5) return 'S';
		if (angle < 157.5) return 'SW';
		if (angle < 202.5) return 'W';
		if (angle < 247.5) return 'NW';
		if (angle < 292.5) return 'N';
		return 'NE';
	}

	const candidate_systems = $derived.by(() => {
		const z = Option.getOrElse(zone, () => null);
		if (!z) return [];
		const center = get_zone_center(z);
		if (!center) return [];
		const connections = Option.getOrElse(z.connections, () => []);
		const connected_set = new Set(connections.map((id) => id as number));
		return editor()
			.project.solar_systems.filter(
				(s) => s.id !== z.origin && !connected_set.has(s.id as number),
			)
			.map((s) => {
				const dx = s.coordinate.x - center.x;
				const dy = s.coordinate.y - center.y;
				return {
					system: s,
					distance: Math.hypot(dx, dy),
					direction: get_direction_label(dx, dy),
				};
			})
			.sort((a, b) => a.distance - b.distance);
	});
</script>

<FloatingPanel
	open={Option.isSome(zone_origin)}
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
				class="flex flex-col flex-nowrap border-secondary-500"
			>
				<FloatingPanel.DragTrigger>
					<FloatingPanel.Header>
						<FloatingPanel.Title>
							<Icons.Castle class="size-4" />
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
						{@const z = zone.value}
						<dl>
							<div class="flex items-baseline gap-2">
								<dt class="label-text">Origin System:</dt>
								<dd>{z.origin}</dd>
							</div>
						</dl>
						<label>
							<span class="label-text">Type</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={z.type}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateFallenEmpireZoneAction({
											old_value: z,
											new_value: new FallenEmpireZone({
												...z,
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
						<label>
							<span class="label-text">Distance</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={z.distance}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateFallenEmpireZoneAction({
											old_value: z,
											new_value: new FallenEmpireZone({
												...z,
												distance: Number(
													e.currentTarget.value,
												) as FallenEmpireZone['distance'],
											}),
										}),
									])}
							>
								{#each DISTANCES as d (d)}
									<option value={d}>{d}</option>
								{/each}
							</select>
						</label>
						<label>
							<span class="label-text">Angle</span>
							<select
								class="select ring-surface-300-700 bg-surface-200-800"
								value={z.angle}
								onchange={(e) =>
									editor().apply_actions([
										new Action.UpdateFallenEmpireZoneAction({
											old_value: z,
											new_value: new FallenEmpireZone({
												...z,
												angle: Number(
													e.currentTarget.value,
												) as FallenEmpireZone['angle'],
											}),
										}),
									])}
							>
								{#each ANGLES as a (a)}
									<option value={a}>{a}&deg;</option>
								{/each}
							</select>
						</label>
						{@const connections = Option.getOrElse(z.connections, () => [])}
						<div>
							<span class="label-text">Connections</span>
							{#if connections.length === 0 && !show_add_connection}
								<p class="text-surface-500 text-sm italic">random</p>
							{/if}
							{#if connections.length > 0}
								<ul class="list-inside list-disc text-sm">
									{#each connections as connected_id (connected_id)}
										{@const connected =
											editor().project.get_solar_system(connected_id)}
										<li class="flex items-center gap-1">
											<span>
												{#if Option.isSome(connected) && Option.isSome(connected.value.get_name())}
													{Option.getOrThrow(connected.value.get_name())}
												{:else}
													System {connected_id}
												{/if}
											</span>
											<button
												class="btn-icon btn-icon-sm preset-tonal-error"
												onclick={() =>
													editor().apply_actions([
														new Action.UpdateFallenEmpireZoneAction({
															old_value: z,
															new_value: new FallenEmpireZone({
																...z,
																connections: Option.some(
																	connections.filter(
																		(id) => id !== connected_id,
																	),
																),
															}),
														}),
													])}
												aria-label="Remove connection"
											>
												<Icons.X class="size-3" />
											</button>
										</li>
									{/each}
								</ul>
							{/if}
							{#if show_add_connection}
								<div
									class="mt-1 max-h-40 overflow-y-auto rounded border border-surface-300-700"
								>
									{#each candidate_systems as { system, distance, direction } (system.id)}
										{@const name = Option.getOrElse(
											system.get_name(),
											() => `System ${system.id}`,
										)}
										<button
											class="flex w-full items-center justify-between px-2 py-1 text-sm hover:bg-surface-200-800"
											onclick={() => {
												const new_connections = [...connections, system.id];
												editor().apply_actions([
													new Action.UpdateFallenEmpireZoneAction({
														old_value: z,
														new_value: new FallenEmpireZone({
															...z,
															connections: Option.some(new_connections),
														}),
													}),
												]);
												show_add_connection = false;
											}}
										>
											<span>{name}</span>
											<span class="text-surface-500 text-xs">
												{Math.round(distance)}
												{direction}
											</span>
										</button>
									{:else}
										<p class="px-2 py-1 text-sm text-surface-500 italic">
											No available systems
										</p>
									{/each}
								</div>
								<button
									class="btn btn-sm preset-tonal-surface mt-1"
									onclick={() => (show_add_connection = false)}
								>
									Cancel
								</button>
							{:else}
								<button
									class="btn btn-sm preset-tonal-surface mt-1"
									onclick={() => (show_add_connection = true)}
								>
									<Icons.Plus class="size-3" />
									Add Connection
								</button>
							{/if}
						</div>
						<button
							class="btn preset-filled-error-500 mt-2"
							onclick={() =>
								editor().apply_actions([
									new Action.DeleteFallenEmpireZoneAction({ zone: z }),
								])}
						>
							Delete Zone
						</button>
					{/if}
				</FloatingPanel.Body>
				<FloatingPanel.ResizeTrigger axis="se" />
			</FloatingPanel.Content>
		</FloatingPanel.Positioner>
	</Portal>
</FloatingPanel>
