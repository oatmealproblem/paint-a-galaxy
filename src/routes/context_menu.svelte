<script lang="ts">
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';
	import type { Coordinate } from '$lib/models/coordinate';
	import type { Nebula } from '$lib/models/nebula';
	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import {
		Array,
		// importing as Number_ prevents issues with svelte LSP
		Number as Number_,
		Option,
		pipe,
	} from 'effect';
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		data: Option.Option<{
			solar_system: Option.Option<SolarSystem>;
			nebulas: Nebula[];
			coordinate: Coordinate;
			coordinate_has_solar_system: boolean;
		}>;
		open_solar_system_details: (id: SolarSystemId) => void;
		on_open: () => void;
		on_close: () => void;
		ctx: CanvasRenderingContext2D;
	};
	const {
		children,
		data,
		open_solar_system_details,
		ctx,
		on_open,
		on_close,
	}: Props = $props();

	const editor = get_editor();
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
			editor().apply_tool('solar_system_delete', solar_system.coordinate, ctx);
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
								<Menu.ItemText>Open Details</Menu.ItemText>
							</Menu.Item>
							<Menu.Item value="delete_solar_system|{solar_system.id}">
								<Menu.ItemText>Delete</Menu.ItemText>
							</Menu.Item>
						</Menu.ItemGroup>
					{/if}
					{#if Option.isSome(data.value.solar_system) && data.value.nebulas.length > 0}
						<Menu.Separator class="border-surface-300-700" />
					{/if}
					{#each data.value.nebulas as nebula (nebula.key)}
						{@const stellaris_coordinate =
							nebula.coordinate.to_stellaris_coordinate()}
						<Menu.ItemGroup>
							<Menu.ItemGroupLabel class="text-surface-800-200">
								Nebula at {stellaris_coordinate.x}, {stellaris_coordinate.y} with
								radius {nebula.radius}
							</Menu.ItemGroupLabel>
							<Menu.Item value="delete_nebula|{nebula.key}">
								<Menu.ItemText>Delete</Menu.ItemText>
							</Menu.Item>
						</Menu.ItemGroup>
					{/each}
					{#if (Option.isSome(data.value.solar_system) || data.value.nebulas.length > 0) && !data.value.coordinate_has_solar_system}
						<Menu.Separator class="border-surface-300-700" />
					{/if}
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
	<Menu.ContextTrigger class="contents">
		{@render children()}
	</Menu.ContextTrigger>
</Menu>
