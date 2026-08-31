<script lang="ts">
	import SectionHeader from '$lib/components/section_header.svelte';
	import StatItem from '$lib/components/stat_item.svelte';
	import {
		CANVAS_HEIGHT,
		CANVAS_WIDTH,
		FALLEN_EMPIRE_ZONE_RADIUS,
		GIGA_AETERNUM_CORE_RADIUS,
		GIGA_RANDOM_CORE_RADIUS,
		L_CLUSTER_CX,
		L_CLUSTER_CY,
		L_CLUSTER_RADIUS,
	} from '$lib/constants';
	import {
		initializer_metadata,
		type InitializerKey,
	} from '$lib/data/initializer_metadata';
	import { get_editor } from '$lib/editor.svelte';
	import { Coordinate } from '$lib/models/coordinate';
	import type { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { Array, Iterable, Option, pipe, Record } from 'effect';

	const editor = get_editor();

	const solar_systems = $derived(editor().project.solar_systems);
	const num_solar_systems = $derived(solar_systems.length);
	const num_spawns = $derived(
		solar_systems.filter(
			(solar_system) => solar_system.spawn_type !== 'disabled',
		).length,
	);
	const num_safe_ai_spawns = $derived(
		Math.max(
			0,
			solar_systems.filter(
				(solar_system) =>
					solar_system.spawn_type === 'enabled' ||
					solar_system.spawn_type === 'preferred',
			).length - 1,
		),
	);
	const systems_by_initializer = $derived(
		pipe(
			solar_systems,
			Iterable.groupBy((solar_system) =>
				Option.getOrElse(solar_system.get_initializer(), () => ''),
			),
		),
	);
	const required_dlc_system_ids = $derived(
		pipe(
			systems_by_initializer,
			Record.toEntries,
			Iterable.flatMap<[string, SolarSystem[]], SolarSystem>(
				([initializer, systems]) => {
					const dlc = initializer_metadata[initializer as InitializerKey]?.dlc;
					if (dlc != null && dlc.length > 0) return systems;
					return [];
				},
			),
			Iterable.map((solar_system) => solar_system.id),
			Array.fromIterable,
		),
	);
	const recommended_dlc = $derived(
		pipe(
			systems_by_initializer,
			Record.keys,
			Iterable.flatMap(
				(initializer) =>
					initializer_metadata[initializer as InitializerKey]?.dlc ?? [],
			),
			(dlc) => new Set(dlc),
		),
	);
	const duplicate_unique_systems = $derived(
		pipe(
			systems_by_initializer,
			Record.filter((value, key) => {
				const is_unique = Boolean(
					key in initializer_metadata &&
					initializer_metadata[key as InitializerKey]?.unique,
				);
				return is_unique && value.length > 1;
			}),
		),
	);
	const num_duplicate_unique_systems = $derived(
		pipe(
			duplicate_unique_systems,
			Record.reduce(0, (acc, cur) => acc + cur.length),
		),
	);
	const duplicate_unique_system_ids = $derived(
		pipe(
			duplicate_unique_systems,
			Record.values,
			Array.flatMap((systems) => systems.map((system) => system.id)),
		),
	);
	const duplicate_name_systems = $derived(
		pipe(
			solar_systems,
			Iterable.groupBy((solar_system) =>
				Option.getOrElse(solar_system.get_name(), () => ''),
			),
			Record.filter((value, key) => key !== '' && value.length > 1),
		),
	);
	const num_duplicate_name_systems = $derived(
		pipe(
			duplicate_name_systems,
			Record.reduce(0, (acc, cur) => acc + cur.length),
		),
	);
	const duplicate_name_system_ids = $derived(
		pipe(
			duplicate_name_systems,
			Record.values,
			Array.flatMap((systems) => systems.map((system) => system.id)),
		),
	);
	const missing_marauder_1 = $derived(
		check_for_missing_associated_systems({
			required: ['marauder_1_1', 'marauder_1_2', 'marauder_1_3'],
			systems_by_initializer,
		}),
	);
	const missing_marauder_2 = $derived(
		check_for_missing_associated_systems({
			required: ['marauder_2_1', 'marauder_2_2', 'marauder_2_3'],
			systems_by_initializer,
		}),
	);
	const missing_marauder_3 = $derived(
		check_for_missing_associated_systems({
			required: ['marauder_3_1', 'marauder_3_2', 'marauder_3_3'],
			systems_by_initializer,
		}),
	);
	const missing_ratling = $derived(
		check_for_missing_associated_systems({
			required: ['ratling_1_1', 'ratling_1_2', 'ratling_1_3'],
			systems_by_initializer,
		}),
	);
	const missing_imperial_fiefdom = $derived(
		check_for_missing_associated_systems({
			required: [
				'overlord_system_init',
				'overlord_system_2_init',
				'overlord_system_3_init',
			],
			optional: [
				'overlord_system_4_init',
				'overlord_system_5_init',
				'overlord_system_6_init',
				'overlord_system_7_init',
				'overlord_system_8_init',
			],
			systems_by_initializer,
		}),
	);
	const fallen_empire_zones = $derived(editor().project.fallen_empire_zones);
	const fallen_empire_zone_centers = $derived(
		pipe(
			fallen_empire_zones,
			Iterable.filterMap((zone) =>
				pipe(
					editor().project.get_fallen_empire_zone_coordinate(zone),
					Option.map((center) => ({ zone, center })),
				),
			),
			Array.fromIterable,
		),
	);
	const overlapping_fallen_empire_zone_ids = $derived(
		pipe(
			fallen_empire_zone_centers,
			Iterable.filter(({ zone, center }) =>
				fallen_empire_zone_centers.some(
					(other) =>
						other.zone.id !== zone.id &&
						center.distance_to(other.center) < FALLEN_EMPIRE_ZONE_RADIUS * 2,
				),
			),
			Iterable.map(({ zone }) => zone.id),
			Array.fromIterable,
		),
	);
	const solar_system_ids_in_fallen_empire_zones = $derived(
		pipe(
			solar_systems,
			Iterable.filter((solar_system) =>
				fallen_empire_zone_centers.some(
					({ center }) =>
						solar_system.coordinate.distance_to(center) <
						FALLEN_EMPIRE_ZONE_RADIUS,
				),
			),
			Iterable.map((solar_system) => solar_system.id),
			Array.fromIterable,
		),
	);
	const out_of_bounds_system_ids = $derived(
		pipe(
			solar_systems,
			Iterable.filter(
				(solar_system) =>
					solar_system.coordinate.x < 0 ||
					solar_system.coordinate.x > CANVAS_WIDTH ||
					solar_system.coordinate.y < 0 ||
					solar_system.coordinate.y > CANVAS_HEIGHT,
			),
			Iterable.map((solar_system) => solar_system.id),
			Array.fromIterable,
		),
	);
	const l_cluster_center = Coordinate.make({
		x: L_CLUSTER_CX,
		y: L_CLUSTER_CY,
	});

	const systems_in_l_cluster_ids = $derived(
		editor().view_settings.show_l_cluster ?
			pipe(
				solar_systems,
				Iterable.filter(
					(solar_system) =>
						solar_system.coordinate.distance_to(l_cluster_center) <
						L_CLUSTER_RADIUS,
				),
				Iterable.map((solar_system) => solar_system.id),
				Array.fromIterable,
			)
		:	[],
	);

	const systems_in_core_ids = $derived(
		(
			editor().view_settings.show_giga_core ||
				editor().view_settings.show_giga_aeternum
		) ?
			pipe(
				solar_systems,
				Iterable.filter((solar_system) => {
					const dist = solar_system.coordinate.distance_to(
						new Coordinate({
							x: CANVAS_WIDTH / 2,
							y: CANVAS_HEIGHT / 2,
						}),
					);
					return (
						(editor().view_settings.show_giga_core &&
							dist < GIGA_RANDOM_CORE_RADIUS) ||
						(editor().view_settings.show_giga_aeternum &&
							dist < GIGA_AETERNUM_CORE_RADIUS)
					);
				}),
				Iterable.map((solar_system) => solar_system.id),
				Array.fromIterable,
			)
		:	[],
	);

	type MissingSystemsWarning = {
		has_initializers: InitializerKey[];
		missing_initializers: InitializerKey[];
		system_ids: SolarSystemId[];
	};
	function check_for_missing_associated_systems({
		required,
		optional = [],
		systems_by_initializer,
	}: {
		required: InitializerKey[];
		optional?: InitializerKey[];
		systems_by_initializer: Record<string, SolarSystem[]>;
	}): Option.Option<MissingSystemsWarning> {
		const has_initializers = required
			.concat(optional)
			.filter((initializer) => initializer in systems_by_initializer);
		const missing_initializers = required.filter(
			(initializer) => !(initializer in systems_by_initializer),
		);
		if (has_initializers.length > 0 && missing_initializers.length > 0) {
			return Option.some({
				has_initializers,
				missing_initializers,
				system_ids: pipe(
					has_initializers,
					Iterable.flatMap(
						(initializer) => systems_by_initializer[initializer] ?? [],
					),
					Iterable.map<SolarSystem, SolarSystemId>(
						(solar_system) => solar_system.id,
					),
					Array.fromIterable,
				),
			});
		} else {
			return Option.none();
		}
	}
</script>

{#snippet missing_systems_warning(
	warning: Option.Option<MissingSystemsWarning>,
	label: string,
)}
	{#if Option.isSome(warning)}
		<StatItem {label} warning solar_system_ids={warning.value.system_ids}>
			{#snippet info()}
				Some unique systems require others to be present.
			{/snippet}
			{#snippet detail()}
				{#each warning.value.missing_initializers as initializer (initializer)}
					<div>{initializer}</div>
				{/each}
			{/snippet}
		</StatItem>
	{/if}
{/snippet}

<SectionHeader>Stats</SectionHeader>
<div class="table-wrap">
	<table class="table">
		<tbody>
			<StatItem
				label="Solar Systems"
				value={num_solar_systems}
				warning={num_solar_systems === 0}
			/>
			<StatItem label="Spawns" value={num_spawns} warning={num_spawns === 0} />
			<StatItem label="Max Safe AI Empires" value={num_safe_ai_spawns}>
				{#snippet info()}
					You should not set the AI Empires slider higher than this, with 2
					exceptions:
					<ul class="list-disc ms-4">
						<li>
							Increase by 1 for for each force-spawned custom design with a
							Reserved spawn.
						</li>
						<li>
							Decrease by 1 for each player beyond the first (unless using a
							Reserved spawn).
						</li>
					</ul>
				{/snippet}
			</StatItem>
			{#if recommended_dlc.size > 0}
				<StatItem
					label="Recommended DLC"
					value={recommended_dlc.size}
					solar_system_ids={required_dlc_system_ids}
				>
					{#snippet info()}
						These DLC are required by the system initializers you've set. If you
						are missing the DLC, the system will be reset to a basic random
						system at the start of the game.
					{/snippet}
					{#snippet detail()}
						{#each recommended_dlc as dlc (dlc)}
							<div>{dlc}</div>
						{/each}
					{/snippet}
				</StatItem>
			{/if}
			{#if num_duplicate_unique_systems > 0}
				<StatItem
					label="Duplicate Unique Systems"
					value={num_duplicate_unique_systems}
					warning
					solar_system_ids={duplicate_unique_system_ids}
				>
					{#snippet info()}
						Multiple systems are set to the same unique system initializer. This
						can cause bugs with event chains.
					{/snippet}
				</StatItem>
			{/if}
			{#if num_duplicate_name_systems > 0}
				<StatItem
					label="Duplicate Names"
					value={num_duplicate_name_systems}
					warning
					solar_system_ids={duplicate_name_system_ids}
				>
					{#snippet info()}
						Multiple systems share the same name. This won't cause any bugs, but
						can be confusing and immersion-breaking.
					{/snippet}
				</StatItem>
			{/if}
			{@render missing_systems_warning(
				missing_marauder_1,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_marauder_2,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_marauder_3,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_ratling,
				'Missing Ketling Systems',
			)}
			{@render missing_systems_warning(
				missing_imperial_fiefdom,
				'Missing Fiefdom Systems',
			)}
			{#if overlapping_fallen_empire_zone_ids.length > 0}
				<StatItem
					label="Overlapping FE Zones"
					value={overlapping_fallen_empire_zone_ids.length}
					warning
					fallen_empire_zone_ids={overlapping_fallen_empire_zone_ids}
				>
					{#snippet info()}
						Fallen Empire zones should not overlap. Fallen Empire systems may
						spawn on top of each other.
					{/snippet}
				</StatItem>
			{/if}
			{#if solar_system_ids_in_fallen_empire_zones.length > 0}
				<StatItem
					label="Systems in FE Zones"
					value={solar_system_ids_in_fallen_empire_zones.length}
					warning
					solar_system_ids={solar_system_ids_in_fallen_empire_zones}
				>
					{#snippet info()}
						Fallen Empire zones should be empty. Solar systems inside a zone may
						overlap with Fallen Empire systems spawned at game start.
					{/snippet}
				</StatItem>
			{/if}
			{#if out_of_bounds_system_ids.length > 0}
				<StatItem
					label="Out-of-Bounds Solar Systems"
					value={out_of_bounds_system_ids.length}
					warning
					solar_system_ids={out_of_bounds_system_ids}
				/>
			{/if}
			{#if systems_in_l_cluster_ids.length > 0}
				<StatItem
					label="Systems in L-Cluster"
					value={systems_in_l_cluster_ids.length}
					warning
					solar_system_ids={systems_in_l_cluster_ids}
				/>
			{/if}
			{#if systems_in_core_ids.length > 0}
				<StatItem
					label="Systems in Core Zone"
					value={systems_in_core_ids.length}
					warning
					solar_system_ids={systems_in_core_ids}
				/>
			{/if}
		</tbody>
	</table>
</div>
