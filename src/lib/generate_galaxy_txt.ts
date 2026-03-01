import { Array, Iterable, pipe } from 'effect';

import {
	FALLEN_EMPIRE_SPAWN_RADIUS,
	CANVAS_HEIGHT,
	SPAWNS_PER_MAX_AI_EMPIRE,
	CANVAS_WIDTH,
} from './constants';
import type { Project } from './models/project';
import type { SolarSystem } from './models/solar_system';
import { Coordinate } from './models/coordinate';
import type { Nebula } from './models/nebula';

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
	num_hyperlanes = { min=0.5 max= 3 }
	num_hyperlanes_default = 1
	colonizable_planet_odds = 1.0
	primitive_odds = 1.0
`;

const TINY = `
	fallen_empire_default = 0
	fallen_empire_max = 1
	marauder_empire_default = 1
	marauder_empire_max = 1
	advanced_empire_default = 0
	crisis_strength = 0.5
	extra_crisis_strength = { 10 25 }
`;

const SMALL = `
	fallen_empire_default = 1
	fallen_empire_max = 2
	marauder_empire_default = 1
	marauder_empire_max = 2
	advanced_empire_default = 1
	crisis_strength = 0.75
	extra_crisis_strength = { 10 25 }
`;

const MEDIUM = `
	fallen_empire_default = 2
	fallen_empire_max = 3
	marauder_empire_default = 2
	marauder_empire_max = 2
	advanced_empire_default = 2
	crisis_strength = 1.0
	extra_crisis_strength = { 10 25 }
`;

const LARGE = `
	fallen_empire_default = 3
	fallen_empire_max = 4
	marauder_empire_default = 2
	marauder_empire_max = 3
	advanced_empire_default = 3
	crisis_strength = 1.25
	extra_crisis_strength = { 10 25 }
`;

const HUGE = `
	fallen_empire_default = 4
	fallen_empire_max = 6
	marauder_empire_default = 3
	marauder_empire_max = 3
	advanced_empire_default = 4
	crisis_strength = 1.5
	extra_crisis_strength = { 10 25 }
`;

export function generate_stellaris_galaxy(project: Project): string {
	const potential_home_stars = project.solar_systems.filter(
		(solar_system) => solar_system.spawn_type !== 'disabled',
	);
	const preferred_home_stars = project.solar_systems.filter(
		(solar_system) => solar_system.spawn_type === 'preferred',
	);

	const ai_empire_settings = `
 	num_empires = { min = 0 max = ${Math.round(potential_home_stars.length / SPAWNS_PER_MAX_AI_EMPIRE)} }	#limits player customization; AI empires don't account for all spawns, so we need to set the max lower than the number of spawn points
	num_empire_default = ${Math.round(potential_home_stars.length / SPAWNS_PER_MAX_AI_EMPIRE / 2)}
	`;

	let size_based_settings = TINY;
	if (project.solar_systems.length >= 400) size_based_settings = SMALL;
	if (project.solar_systems.length >= 600) size_based_settings = MEDIUM;
	if (project.solar_systems.length >= 800) size_based_settings = LARGE;
	if (project.solar_systems.length >= 1000) size_based_settings = HUGE;

	const fallen_empire_spawns: {
		solar_system: SolarSystem;
		direction: 'n' | 'e' | 's' | 'w';
	}[] = [];
	for (const star of project.solar_systems) {
		for (const direction of ['n', 'e', 's', 'w'] as const) {
			if (
				can_spawn_fallen_empire_in_direction(
					star,
					direction,
					project.solar_systems,
					fallen_empire_spawns.map((fe) =>
						get_fallen_empire_origin(fe.solar_system, fe.direction),
					),
				)
			) {
				fallen_empire_spawns.push({ solar_system: star, direction });
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
			if (from_is_spawn && !to_is_spawn) return [connection.a];
			if (to_is_spawn && !from_is_spawn) return [connection.b];
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
				return [connection.a];
			if (to_is_adjacent && !from_is_adjacent && !from_is_spawn)
				return [connection.b];
			return [];
		}),
	);

	const systems_entries = project.solar_systems
		.map((star, i) => {
			const basics = `id = "${star.id}" position = { x = ${star.coordinate.to_stellaris_coordinate().x} y = ${star.coordinate.to_stellaris_coordinate().y} }`;

			let initializer = '';
			let spawn_weight = '';
			if (potential_home_stars.includes(star)) {
				initializer = `initializer = random_empire_init_0${(i % 6) + 1}`;
				const params =
					preferred_home_stars.includes(star) ?
						`|PREFERRED|yes|RANDOM_MODULO|${preferred_home_stars.length}|RANDOM_VALUE|${preferred_home_stars.indexOf(star)}|`
					:	`|RANDOM_MODULO|10|RANDOM_VALUE|${i % 10}|`;
				spawn_weight = `spawn_weight = { base = 0 add = value:painted_galaxy_spawn_weight${params} }`;
			} else if (systems_1_jump_from_spawn.has(star.id)) {
				// all systems with 1 of a spawn point get a random basic initializer
				// this mimics the effect of the "empire_cluster" flag in a random galaxy
				initializer = `initializer = ${get_random_system_basic_system_initializer()}`;
			} else if (systems_2_jumps_from_spawn.has(star.id)) {
				// in a random galaxy, all systems within 2 of a spawn also get the "empire_cluster" effect
				// however, not all spawn points will actually be used, so we don't want to overly restrict system spawns, so a random chance is used
				// the chance is based on the number systems within 2 jumps of a spawn point, so it scaled inversely with the connectedness and number of spawns
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

			const this_star_fallen_empire_spawns = fallen_empire_spawns.filter(
				(fe) => fe.solar_system === star,
			);
			const fe_spawn_effect =
				this_star_fallen_empire_spawns.length > 0 ?
					`set_star_flag = painted_galaxy_fe_spawn ${this_star_fallen_empire_spawns.map((fe) => `set_star_flag = painted_galaxy_fe_spawn_${fe.direction}`).join(' ')}`
				:	'';

			const wormhole_index = project.wormholes.findIndex(
				(connection) => connection.a === star.id || connection.b === star.id,
			);
			const wormhole_effect =
				wormhole_index >= 0 ?
					`set_star_flag = painted_galaxy_wormhole_${wormhole_index}`
				:	'';

			const effects = [fe_spawn_effect, wormhole_effect];
			const effect =
				effects.some(Boolean) ? `effect = { ${effects.join(' ')} }` : '';
			return `\tsystem = { ${basics} ${initializer} ${spawn_weight} ${effect} }`;
		})
		.join('\n');

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
		`static_galaxy_scenario = {`,
		`\tname="${project.name}"`,
		COMMON,
		ai_empire_settings,
		size_based_settings,
		systems_entries,
		hyperlanes_entries,
		nebula_entries,
		'}',
	].join('\n\n');
}

function get_fallen_empire_origin(
	solar_system: SolarSystem,
	direction: 'n' | 's' | 'e' | 'w',
): Coordinate {
	switch (direction) {
		case 'n':
			return Coordinate.make({
				x: solar_system.coordinate.x,
				y: solar_system.coordinate.y - FALLEN_EMPIRE_SPAWN_RADIUS,
			});
		case 's':
			return Coordinate.make({
				x: solar_system.coordinate.x,
				y: solar_system.coordinate.y + FALLEN_EMPIRE_SPAWN_RADIUS,
			});
		case 'e':
			return Coordinate.make({
				x: solar_system.coordinate.x + FALLEN_EMPIRE_SPAWN_RADIUS,
				y: solar_system.coordinate.y,
			});
		case 'w':
			return Coordinate.make({
				x: solar_system.coordinate.x - FALLEN_EMPIRE_SPAWN_RADIUS,
				y: solar_system.coordinate.y,
			});
	}
}

function can_spawn_fallen_empire_in_direction(
	from_solar_system: SolarSystem,
	direction: 'n' | 's' | 'e' | 'w',
	solar_systems: readonly SolarSystem[],
	existing_fallen_empire_spawns: Coordinate[],
): boolean {
	const origin = get_fallen_empire_origin(from_solar_system, direction);
	// origin is not near edge of canvas
	if (
		origin.x < FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin.x > CANVAS_WIDTH - FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin.y < FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin.y > CANVAS_HEIGHT - FALLEN_EMPIRE_SPAWN_RADIUS
	)
		return false;
	// spawn area does not contain any stars or overlap with another fallen empire spawn area
	return (
		solar_systems.every(
			(solar_system) =>
				solar_system.coordinate.distance_to(origin) >=
				FALLEN_EMPIRE_SPAWN_RADIUS,
		) &&
		existing_fallen_empire_spawns.every(
			(coordinate) =>
				coordinate.distance_to(origin) >= FALLEN_EMPIRE_SPAWN_RADIUS * 2,
		)
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
	Array.fromIterable,
);
function get_random_system_basic_system_initializer() {
	const index = Math.floor(
		Math.random() * WEIGHTED_MISC_SYSTEM_INITIALIZERS.length,
	);
	return WEIGHTED_MISC_SYSTEM_INITIALIZERS[index];
}
