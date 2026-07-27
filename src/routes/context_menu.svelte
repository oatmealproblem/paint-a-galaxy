<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import { get_editor } from '$lib/editor.svelte';
	import { get_direction_label } from '$lib/math';
	import { Action } from '$lib/models/action';
	import type { Coordinate } from '$lib/models/coordinate';
	import {
		FallenEmpireZone,
		FallenEmpireZoneId,
	} from '$lib/models/fallen_empire_zone';
	import type { Nebula } from '$lib/models/nebula';
	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { EMPTY_TOOL_SETTINGS } from '$lib/models/tool';
	import { Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import {
		Array,
		// importing as Number_ prevents issues with svelte LSP
		Number as Number_,
		Option,
		Order,
		pipe,
	} from 'effect';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		data: Option.Option<{
			solar_system: Option.Option<SolarSystem>;
			nebulas: Nebula[];
			fallen_empire_zones: FallenEmpireZone[];
			coordinate: Coordinate;
			coordinate_has_solar_system: boolean;
		}>;
		open_solar_system_details: (id: SolarSystemId) => void;
		open_fallen_empire_zone_details: (id: FallenEmpireZoneId) => void;
		on_open: () => void;
		on_close: () => void;
		ctx: CanvasRenderingContext2D;
	};
	const {
		children,
		data,
		open_solar_system_details,
		open_fallen_empire_zone_details,
		ctx,
		on_open,
		on_close,
	}: Props = $props();

	const editor = get_editor();
	const project = $derived(editor().project);
</script>

<Menu
	positioning={{
		placement: 'right-start',
		offset: { mainAxis: 0, crossAxis: 0 },
	}}
	open={Option.isSome(data)}
	onOpenChange={(details) => {
		if (details.open) {
			on_open();
		} else {
			on_close();
		}
	}}
	onSelect={(details) => {
		if (details.value.startsWith('open_solar_system_details')) {
			const id = pipe(
				details.value.split('|'),
				Array.get(1),
				Option.flatMap(Number_.parse),
				Option.map(SolarSystemId.make),
				Option.getOrThrow,
			);
			open_solar_system_details(id);
		} else if (details.value.startsWith('delete_solar_system')) {
			const id = pipe(
				details.value.split('|'),
				Array.get(1),
				Option.flatMap(Number_.parse),
				Option.map(SolarSystemId.make),
				Option.getOrThrow,
			);
			const solar_system = editor().project.get_solar_system_unsafe(id);
			// apply the 'solar_system_delete' tool instead of creating the DeleteSolarSystemAction manually, so hyperlanes etc are also deleted
			// force bulk off so exactly this system is deleted, regardless of the persisted tool settings
			editor().apply_tool(
				'solar_system_delete',
				solar_system.coordinate,
				ctx,
				EMPTY_TOOL_SETTINGS,
			);
		} else if (details.value.startsWith('open_fallen_empire_zone_details')) {
			const id = pipe(
				details.value.split('|'),
				Array.get(1),
				Option.map(FallenEmpireZoneId.make),
				Option.getOrThrow,
			);
			open_fallen_empire_zone_details(id);
		} else if (details.value.startsWith('delete_fallen_empire_zone')) {
			const id = pipe(
				details.value.split('|'),
				Array.get(1),
				Option.map(FallenEmpireZoneId.make),
				Option.getOrThrow,
			);
			const zone = pipe(
				editor().project.fallen_empire_zones,
				Array.findFirst((zone) => zone.id === id),
			);
			if (Option.isSome(zone)) {
				editor().apply_actions([
					new Action.DeleteFallenEmpireZoneAction({ zone: zone.value }),
				]);
			}
		} else if (details.value.startsWith('delete_nebula')) {
			const key = pipe(
				details.value.split('|'),
				Array.get(1),
				Option.getOrThrow,
			);
			const nebula = pipe(
				editor().project.nebulas,
				Array.findFirst((nebula) => nebula.key === key),
				Option.getOrThrow,
			);
			editor().apply_actions([new Action.DeleteNebulaAction({ nebula })]);
		} else if (details.value === 'create_solar_system') {
			if (Option.isSome(data))
				editor().apply_tool('solar_system_create', data.value.coordinate, ctx);
		}
	}}
>
	<Portal>
		<Menu.Positioner class="z-10!">
			<Menu.Content class="bg-surface-100-900 border-surface-300-700">
				{#if Option.isSome(data)}
					{#if Option.isSome(data.value.solar_system)}
						{@const solar_system = data.value.solar_system.value}
						{@const stellaris_coordinate =
							solar_system.coordinate.to_stellaris_coordinate()}
						<Menu.ItemGroup>
							<Menu.ItemGroupLabel class="text-surface-800-200">
								Solar system at {stellaris_coordinate.x}, {stellaris_coordinate.y}
								{#if Option.isSome(solar_system.get_name())}
									<em class="block">
										{solar_system.get_name().pipe(Option.getOrThrow)}
									</em>
								{/if}
							</Menu.ItemGroupLabel>
							<Menu.Item value="open_solar_system_details|{solar_system.id}">
								<Menu.ItemText>Open System Details</Menu.ItemText>
							</Menu.Item>
							<Menu.Item value="delete_solar_system|{solar_system.id}">
								<Menu.ItemText>Delete System</Menu.ItemText>
							</Menu.Item>
							{#if project.fallen_empire_zones.length > 0}
								{@const sorted_zones = pipe(
									project.fallen_empire_zones,
									Array.sortBy(
										Order.mapInput(Order.number, (zone) =>
											project
												.get_fallen_empire_zone_coordinate_unsafe(zone)
												.distance_to(solar_system.coordinate),
										),
									),
								)}
								<Menu positioning={{ offset: { mainAxis: 8, crossAxis: -8 } }}>
									<Menu.TriggerItem value="connect_to_fallen_empire">
										<Menu.ItemText>Connect to Fallen Empire</Menu.ItemText>
										<Menu.ItemIndicator>
											<Icons.ChevronRight class="size-4" />
										</Menu.ItemIndicator>
										<Portal>
											<Menu.Positioner class="z-10!">
												<Menu.Content
													class="bg-surface-100-900 border-surface-300-700"
												>
													{#each sorted_zones as zone (zone.id)}
														{@const center =
															project.get_fallen_empire_zone_coordinate_unsafe(
																zone,
															)}
														<Menu.OptionItem
															type="checkbox"
															value={zone.id}
															checked={zone.connections.includes(
																solar_system.id,
															)}
															onCheckedChange={(checked) => {
																const updatedConnections =
																	checked ?
																		[...zone.connections, solar_system.id]
																	:	zone.connections.filter(
																			(id) => id !== solar_system.id,
																		);
																editor().apply_actions([
																	new Action.UpdateFallenEmpireZoneAction({
																		old_value: zone,
																		new_value: new FallenEmpireZone({
																			...zone,
																			connections: updatedConnections,
																		}),
																	}),
																]);
															}}
														>
															<Menu.ItemText>
																{Math.round(
																	center.distance_to(solar_system.coordinate),
																)} units {get_direction_label(
																	center.x - solar_system.coordinate.x,
																	center.y - solar_system.coordinate.y,
																)}
															</Menu.ItemText>
															<Menu.ItemIndicator
																class="hidden data-[state=checked]:block ms-2"
															>
																<Icons.Check class="size-4" />
															</Menu.ItemIndicator>
														</Menu.OptionItem>
													{/each}
												</Menu.Content>
											</Menu.Positioner>
										</Portal>
									</Menu.TriggerItem>
								</Menu>
							{/if}
						</Menu.ItemGroup>
					{/if}

					<Menu.Separator class="border-surface-300-700" />

					{#each data.value.nebulas as nebula (nebula.key)}
						{@const stellaris_coordinate =
							nebula.coordinate.to_stellaris_coordinate()}
						<Menu.ItemGroup>
							<Menu.ItemGroupLabel class="text-surface-800-200">
								Nebula at {stellaris_coordinate.x}, {stellaris_coordinate.y} with
								radius {nebula.radius}
							</Menu.ItemGroupLabel>
							<Menu.Item value="delete_nebula|{nebula.key}">
								<Menu.ItemText>Delete Nebula</Menu.ItemText>
							</Menu.Item>
						</Menu.ItemGroup>
					{/each}

					<Menu.Separator class="border-surface-300-700" />

					{#each data.value.fallen_empire_zones as zone (zone.id)}
						{@const stellaris_coordinate = project
							.get_fallen_empire_zone_coordinate_unsafe(zone)
							.to_stellaris_coordinate()
							.to_rounded()}
						<Menu.ItemGroup>
							<Menu.ItemGroupLabel class="text-surface-800-200">
								Fallen Empire Zone at {stellaris_coordinate.x}, {stellaris_coordinate.y}
							</Menu.ItemGroupLabel>
							<Menu.Item value="open_fallen_empire_zone_details|{zone.id}">
								<Menu.ItemText>Open Zone Details</Menu.ItemText>
							</Menu.Item>
							<Menu.Item value="delete_fallen_empire_zone|{zone.id}">
								<Menu.ItemText>Delete Zone</Menu.ItemText>
							</Menu.Item>
						</Menu.ItemGroup>
					{/each}

					<Menu.Separator class="border-surface-300-700" />

					{#if !data.value.coordinate_has_solar_system}
						{@const coordinate =
							data.value.coordinate.to_stellaris_coordinate()}
						<Menu.ItemGroup>
							<Menu.ItemGroupLabel class="text-surface-800-200">
								Coordinate {coordinate.x}, {coordinate.y}
							</Menu.ItemGroupLabel>
							<Menu.Item value="create_solar_system">
								<Menu.ItemText>Create Solar System</Menu.ItemText>
							</Menu.Item>
						</Menu.ItemGroup>
					{/if}
				{/if}
			</Menu.Content>
		</Menu.Positioner>
	</Portal>
	<Menu.ContextTrigger class="contents" style="cursor: inherit;">
		{@render children()}
	</Menu.ContextTrigger>
</Menu>
