import { Array, Effect, Iterable, Option, Order, pipe } from 'effect';

import {
	FALLEN_EMPIRE_ZONE_RADIUS,
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	GIGA_RANDOM_CORE_RADIUS,
	L_CLUSTER_CX,
	L_CLUSTER_CY,
	L_CLUSTER_RADIUS,
	FALLEN_EMPIRE_ZONE_ANGLES,
	FALLEN_EMPIRE_ZONE_DEFAULT_DISTANCE,
} from './constants';
import type { Project } from './models/project';
import { SolarSystem } from './models/solar_system';
import { Coordinate } from './models/coordinate';
import type { Nebula } from './models/nebula';
import {
	initializer_metadata,
	type InitializerKey,
} from './data/initializer_metadata';
import {
	FallenEmpireZone,
	FallenEmpireZoneId,
} from './models/fallen_empire_zone';
import { convert_degrees_to_radians } from './math';
import { Random } from 'effect';

const DIRECTIONS = {
	0: 'e',
	45: 'se',
	90: 's',
	135: 'sw',
	180: 'w',
	225: 'nw',
	270: 'n',
	315: 'ne',
} as const;

const COMMON = `
	priority = 10
	supports_shape = elliptical
	supports_shape = ring
	supports_shape = spiral_2
	supports_shape = spiral_3
	supports_shape = spiral_4
	supports_shape = spiral_6
	supports_shape = bar
	supports_shape = starburst
	supports_shape = cartwheel
	supports_shape = spoked
	random_hyperlanes = no

	num_wormhole_pairs = { min = 0 max = 5 }
	num_wormhole_pairs_default = 1
	num_gateways = { min = 0 max = 5 }
	num_gateways_default = 1
	num_hyperlanes = { min= 0.5 max= 3 }
	num_hyperlanes_default = 1
	colonizable_planet_odds = 1.0
	primitive_odds = 1.0

	# don't limit by galaxy size; modded players can do crazy things if they want
	fallen_empire_max = 6
	marauder_empire_max = 3
	extra_crisis_strength = { 10 25 }
`;

const TINY = `
	fallen_empire_default = 0
	marauder_empire_default = 1
	crisis_strength = 0.5
`;

const SMALL = `
	fallen_empire_default = 1
	marauder_empire_default = 1
	crisis_strength = 0.75
`;

const MEDIUM = `
	fallen_empire_default = 2
	marauder_empire_default = 2
	crisis_strength = 1.0
`;

const LARGE = `
	fallen_empire_default = 3
	marauder_empire_default = 2
	crisis_strength = 1.25
`;

const HUGE = `
	fallen_empire_default = 4
	marauder_empire_default = 3
	crisis_strength = 1.5
`;

export function generate_stellaris_galaxy(project: Project): string {
	const potential_home_stars = project.solar_systems.filter(
		(solar_system) => solar_system.spawn_type !== 'disabled',
	);
	const preferred_home_stars = project.solar_systems.filter(
		(solar_system) => solar_system.spawn_type === 'preferred',
	);

	// stats
	const num_solar_systems = project.solar_systems.length;
	const num_spawns = project.solar_systems.filter(
		(system) => system.spawn_type !== 'disabled',
	).length;
	const num_reserved_spawns = project.solar_systems.filter((system) =>
		system.spawn_type.startsWith('reserved'),
	).length;
	const max_safe_ai_spawns = Math.max(0, num_spawns - num_reserved_spawns - 1);
	const num_wormholes = project.wormholes.length;
	const recommended_dlc = pipe(
		project.solar_systems,
		Iterable.filterMap((solar_system) =>
			solar_system.get_initializer_metadata(),
		),
		Iterable.flatMap((metadata) => metadata.dlc),
		Array.sort(Order.string),
		Array.dedupeAdjacent,
		Array.join(', '),
		(s) => (s === '' ? 'None' : s),
	);

	const ai_empire_settings = `
 	num_empires = { min = 0 max = ${potential_home_stars.length - 1} }	# reduce max by 1 to save a spot for the player
	num_empire_default = ${Math.min(max_safe_ai_spawns, Math.round((potential_home_stars.length - 1) / 2))} # max/2
	advanced_empire_default = ${Math.round((potential_home_stars.length - 1) / 8)} # max/8
	nomad_empire_default = ${Math.round((potential_home_stars.length - 1) / 10)} # max/10
	nomad_empire_max = ${potential_home_stars.length - 1} # same as num_empires max, go nomads-only if you want
	`;

	let size_based_settings = TINY;
	if (project.solar_systems.length >= 400) size_based_settings = SMALL;
	if (project.solar_systems.length >= 600) size_based_settings = MEDIUM;
	if (project.solar_systems.length >= 800) size_based_settings = LARGE;
	if (project.solar_systems.length >= 1000) size_based_settings = HUGE;

	const fallen_empire_zones: FallenEmpireZone[] =
		project.fallen_empire_zones.slice();
	// find additional FE spawns
	for (const solar_system of project.solar_systems) {
		for (const angle of FALLEN_EMPIRE_ZONE_ANGLES) {
			if (
				!fallen_empire_zones.some((zone) => zone.origin === solar_system.id) &&
				can_spawn_fallen_empire_in_direction(
					solar_system,
					angle,
					project.solar_systems,
					fallen_empire_zones.map((zone) =>
						project.get_fallen_empire_zone_coordinate_unsafe(zone),
					),
				)
			) {
				fallen_empire_zones.push(
					new FallenEmpireZone({
						id: FallenEmpireZoneId.make(crypto.randomUUID()),
						origin: solar_system.id,
						type: 'random',
						angle,
						connections: [],
						distance: FALLEN_EMPIRE_ZONE_DEFAULT_DISTANCE,
						fallback_to_random: false,
					}),
				);
			}
		}
	}

	// const key_to_id = Object.fromEntries(
	// 	solar_systems.map((coords, i) => [coords.toString(), i]),
	// );

	const systems_1_jump_from_spawn = new Set(
		project.hyperlanes.flatMap((connection) => {
			const from_is_spawn = potential_home_stars.some(
				(solar_system) => solar_system.id === connection.a,
			);
			const to_is_spawn = potential_home_stars.some(
				(solar_system) => solar_system.id === connection.b,
			);
			if (from_is_spawn && !to_is_spawn) return [connection.b];
			if (to_is_spawn && !from_is_spawn) return [connection.a];
			return [];
		}),
	);
	const systems_2_jumps_from_spawn = new Set(
		project.hyperlanes.flatMap((connection) => {
			const from_is_spawn = potential_home_stars.some(
				(solar_system) => solar_system.id === connection.a,
			);
			const to_is_spawn = potential_home_stars.some(
				(solar_system) => solar_system.id === connection.b,
			);
			const from_is_adjacent = systems_1_jump_from_spawn.has(connection.a);
			const to_is_adjacent = systems_1_jump_from_spawn.has(connection.b);
			if (from_is_adjacent && !to_is_adjacent && !to_is_spawn)
				return [connection.b];
			if (to_is_adjacent && !from_is_adjacent && !from_is_spawn)
				return [connection.a];
			return [];
		}),
	);

	const systems_entries = pipe(
		project.solar_systems,
		// stellaris assigns initializers in the order the systems are listed, so the first systems get all the high-weight (ie guaranteed) initializers
		// shuffle the order so the distribution is more even, esp for projects with many hand-placed systems
		Random.shuffle,
		Effect.runSync,
		// sort systems with initializers to the top, otherwise random systems might use unique initializers first
		Array.sortBy(
			Order.mapInput(Order.number, (solar_system) =>
				Option.match(solar_system.get_initializer(), {
					onSome: (initializer) => {
						if (
							initializer in initializer_metadata &&
							initializer_metadata[initializer as InitializerKey]?.after != null
						) {
							// this initializer must be spawned after some other initializer, so sort after others that don't have this constraint
							return 0;
						} else {
							return -1;
						}
					},
					onNone: () => 1,
				}),
			),
		),
		Iterable.map((solar_system, i) => {
			const basics = `id = "${solar_system.id}" position = { x = ${solar_system.coordinate.to_stellaris_coordinate().x} y = ${solar_system.coordinate.to_stellaris_coordinate().y} }`;

			const name = solar_system.name.pipe(
				Option.match({
					onNone: () => '',
					onSome: (value) =>
						`name = "${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`,
				}),
			);
			let initializer = '';
			let initializer_effect = '';
			let spawn_weight = '';
			if (potential_home_stars.includes(solar_system)) {
				const initializer_key = solar_system
					.get_initializer()
					.pipe(Option.getOrElse(() => `random_empire_init_0${(i % 6) + 1}`));
				initializer = `initializer = ${initializer_key}`;
				const params =
					solar_system.spawn_type.startsWith('reserved') ?
						`|RESERVED|${solar_system.spawn_type.at(-1)}|RANDOM_MODULO|3|RANDOM_VALUE|${i % 3}|`
					: solar_system.spawn_type === 'preferred' ?
						`|PREFERRED|yes|RANDOM_MODULO|${preferred_home_stars.length}|RANDOM_VALUE|${preferred_home_stars.indexOf(solar_system)}|`
					:	`|RANDOM_MODULO|10|RANDOM_VALUE|${i % 10}|`;
				spawn_weight = `spawn_weight = { base = 0 add = value:painted_galaxy_spawn_weight${params} }`;
			} else if (Option.isSome(solar_system.get_initializer())) {
				initializer = `initializer = ${solar_system.get_initializer().pipe(Option.getOrThrow)}`;
				const metadata =
					initializer_metadata[
						solar_system
							.get_initializer()
							.pipe(Option.getOrThrow) as InitializerKey
					];
				if (metadata?.init_effect) {
					initializer_effect = metadata.init_effect;
				}
			} else if (systems_1_jump_from_spawn.has(solar_system.id)) {
				// all systems with 1 of a spawn point get a random basic initializer
				// this mimics the effect of the "empire_cluster" flag in a random galaxy
				initializer = `initializer = ${get_random_system_basic_system_initializer()}`;
			} else if (systems_2_jumps_from_spawn.has(solar_system.id)) {
				// in a random galaxy, all systems within 2 of a spawn also get the "empire_cluster" effect
				// however, not all spawn points will actually be used, so we don't want to overly restrict system spawns, so a random chance is used
				// the chance is based on the total number systems within 2 jumps of a spawn point, so it scaled inversely with the connectedness and number of spawns
				// eg on a low connectivity map, systems within 2 are more likely to get a basic init; this helps empires not get boxed in by hostile creatures etc
				const num_basic_systems =
					potential_home_stars.length +
					systems_1_jump_from_spawn.size +
					systems_2_jumps_from_spawn.size;
				const chance = 1 - num_basic_systems / project.solar_systems.length;
				if (Math.random() < chance) {
					initializer = `initializer = ${get_random_system_basic_system_initializer()}`;
				}
			}

			const fe_zone = Array.findFirst(
				fallen_empire_zones,
				(zone) => zone.origin === solar_system.id,
			);
			const fe_spawn_effect =
				Option.isSome(fe_zone) ?
					[
						'set_star_flag = painted_galaxy_fe_spawn',
						`set_star_flag = painted_galaxy_fe_spawn_${DIRECTIONS[fe_zone.value.angle]}`,
						`set_star_flag = painted_galaxy_fe_spawn_${fe_zone.value.type}`,
						`set_star_flag = painted_galaxy_fe_spawn_distance_${fe_zone.value.distance}`,
						...(project.fallen_empire_zones.includes(fe_zone.value) ?
							['set_star_flag = painted_galaxy_fe_spawn_preferred']
						:	[]),
						...(fe_zone.value.connections.length > 0 ?
							[
								'set_star_flag = painted_galaxy_fe_custom_connections',
								`set_star_flag = painted_galaxy_fe_custom_connection_id_${fallen_empire_zones.indexOf(fe_zone.value)}`,
							]
						:	[]),
						...(fe_zone.value.fallback_to_random ?
							['set_star_flag = painted_galaxy_fe_spawn_fallback']
						:	[]),
					].join(' ')
				:	'';

			const fe_connection_effect = fallen_empire_zones
				.filter((zone) => zone.connections.includes(solar_system.id))
				.map(
					(zone) =>
						`set_star_flag = painted_galaxy_fe_custom_connection_to_${fallen_empire_zones.indexOf(zone)}`,
				)
				.join(' ');

			const wormhole_index = project.wormholes.findIndex(
				(connection) =>
					connection.a === solar_system.id || connection.b === solar_system.id,
			);
			const wormhole_effect =
				wormhole_index >= 0 ?
					// the empire_cluster flag prevents random wormholes from spawning there, see game_start.31
					`set_star_flag = painted_galaxy_wormhole_${wormhole_index} set_star_flag = empire_cluster`
				:	'';

			const effects = [
				fe_spawn_effect,
				fe_connection_effect,
				wormhole_effect,
				initializer_effect,
			];
			const effect =
				effects.some(Boolean) ? `effect = { ${effects.join(' ')} }` : '';
			return `\tsystem = { ${basics} ${name} ${initializer} ${spawn_weight} ${effect} }`;
		}),
		Array.join('\n'),
	);

	const hyperlanes_entries = project.hyperlanes
		.map(
			(connection) =>
				`\tadd_hyperlane = { from = "${connection.a}" to = "${connection.b}" }`,
		)
		.join('\n');

	// find groups of overlapping nebulas, so we can treat them as a single non-circular nebula
	// (only the largest nebula in each groups gets a name on the map, the rest are given a blank name)
	let nebula_groups: Nebula[][] = [];
	for (const nebula of project.nebulas) {
		const overlapping_groups = nebula_groups.filter((group) =>
			group.some(
				(group_nebula) =>
					group_nebula.coordinate.distance_to(nebula.coordinate) <
					group_nebula.radius + nebula.radius,
			),
		);
		if (overlapping_groups.length === 0) {
			// create new group containing just this nebula
			nebula_groups.push([nebula]);
		} else if (overlapping_groups.length === 1) {
			// add to group
			overlapping_groups[0]?.push(nebula);
		} else {
			// remove the overlapping groups
			nebula_groups = nebula_groups.filter(
				(group) => !overlapping_groups.includes(group),
			);
			// create a new group combining the overlapping groups and this nebula
			nebula_groups.push([...overlapping_groups.flat(), nebula]);
		}
	}
	// sort nebulas in each group by size
	nebula_groups.forEach((group) => group.sort((a, b) => b.radius - a.radius));
	const nebula_entries = nebula_groups
		.flatMap((group) =>
			group.map(
				(nebula, i) =>
					`\tnebula = { ${i !== 0 ? 'name = " "' : ''} position = { x = ${nebula.coordinate.to_stellaris_coordinate().x} y = ${nebula.coordinate.to_stellaris_coordinate().y} } radius = ${nebula.radius} }`,
			),
		)
		.join('\n');

	return [
		'# README for what to do with this file, read the Steam Workshop page https://steamcommunity.com/sharedfiles/filedetails/?id=3532904115',
		'',
		'# Stats:',
		`# Solar Systems: ${num_solar_systems}`,
		`# Total Spawns: ${num_spawns}`,
		`# Reserved Spawns: ${num_reserved_spawns}`,
		`# Maximum Safe AI Spawns: ${max_safe_ai_spawns} (do not spawn more AI empires than this, unless you are force-spawning custom designs that use reserved spawns)`,
		`# Wormholes: ${num_wormholes} (in addition to random wormholes)`,
		`# Recommended DLC: ${recommended_dlc}`,
		'',
		`static_galaxy_scenario = {`,
		`\tname="${project.name}"`,
		COMMON,
		ai_empire_settings,
		size_based_settings,
		'',
		systems_entries,
		'',
		hyperlanes_entries,
		'',
		nebula_entries,
		'}',
	].join('\n');
}

function can_spawn_fallen_empire_in_direction(
	from_solar_system: SolarSystem,
	direction: FallenEmpireZone['angle'],
	solar_systems: readonly SolarSystem[],
	existing_fallen_empire_spawns: Coordinate[],
): boolean {
	const center = from_solar_system.coordinate.get_coordinate_in_direction(
		convert_degrees_to_radians(direction),
		FALLEN_EMPIRE_ZONE_DEFAULT_DISTANCE,
	);

	const is_near_core =
		center.distance_to(
			new Coordinate({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }),
		) <
		GIGA_RANDOM_CORE_RADIUS + FALLEN_EMPIRE_ZONE_RADIUS;

	const is_near_l_cluster =
		center.distance_to(new Coordinate({ x: L_CLUSTER_CX, y: L_CLUSTER_CY })) <
		L_CLUSTER_RADIUS + FALLEN_EMPIRE_ZONE_RADIUS;

	const is_near_edge =
		center.x < FALLEN_EMPIRE_ZONE_RADIUS ||
		center.x > CANVAS_WIDTH - FALLEN_EMPIRE_ZONE_RADIUS ||
		center.y < FALLEN_EMPIRE_ZONE_RADIUS ||
		center.y > CANVAS_HEIGHT - FALLEN_EMPIRE_ZONE_RADIUS;

	const is_near_solar_system = solar_systems.some(
		(solar_system) =>
			solar_system.coordinate.distance_to(center) < FALLEN_EMPIRE_ZONE_RADIUS,
	);

	const is_near_fe_zone = existing_fallen_empire_spawns.some(
		(coordinate) =>
			coordinate.distance_to(center) < FALLEN_EMPIRE_ZONE_RADIUS * 2,
	);

	return !(
		is_near_core ||
		is_near_l_cluster ||
		is_near_edge ||
		is_near_solar_system ||
		is_near_fe_zone
	);
}

const WEIGHTED_MISC_SYSTEM_INITIALIZERS = pipe(
	Iterable.empty(),
	Iterable.appendAll(Iterable.replicate('basic_init_01', 20)),
	Iterable.appendAll(Iterable.replicate('basic_init_02', 20)),
	Iterable.appendAll(Iterable.replicate('basic_init_03', 10)),
	Iterable.appendAll(Iterable.replicate('basic_init_04', 10)),
	Iterable.appendAll(Iterable.replicate('basic_init_05', 6)),
	Iterable.appendAll(Iterable.replicate('basic_init_06', 4)),
	Iterable.appendAll(Iterable.replicate('asteroid_init_01', 2)),
	Iterable.appendAll(Iterable.replicate('binary_init_01', 6)),
	Iterable.appendAll(Iterable.replicate('binary_init_02', 4)),
	Iterable.appendAll(Iterable.replicate('trinary_init_01', 3)),
	Iterable.appendAll(Iterable.replicate('trinary_init_02', 3)),
	Iterable.appendAll(Iterable.replicate('special_init_01', 2)), // black hole
	Iterable.appendAll(Iterable.replicate('special_init_08', 2)), // neutron star
	Iterable.appendAll(Iterable.replicate('special_init_09', 2)), // pulsar
	Array.fromIterable,
);
function get_random_system_basic_system_initializer() {
	const index = Math.floor(
		Math.random() * WEIGHTED_MISC_SYSTEM_INITIALIZERS.length,
	);
	return WEIGHTED_MISC_SYSTEM_INITIALIZERS[index];
}
