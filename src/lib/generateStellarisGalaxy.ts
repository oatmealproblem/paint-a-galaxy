import { Array, Iterable, pipe } from 'effect';

import { FALLEN_EMPIRE_SPAWN_RADIUS, HEIGHT, SPAWNS_PER_MAX_AI_EMPIRE, WIDTH } from './constants';
import { are_points_equal } from './utils';

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

export function generate_stellaris_galaxy(
	name: string,
	stars: [number, number][],
	connections: [[number, number], [number, number]][],
	wormholes: [[number, number], [number, number]][],
	potential_home_stars: string[],
	preferred_home_stars: string[],
	nebulas: [number, number, number][],
): string {
	const ai_empire_settings = `
 	num_empires = { min = 0 max = ${Math.round(potential_home_stars.length / SPAWNS_PER_MAX_AI_EMPIRE)} }	#limits player customization; AI empires don't account for all spawns, so we need to set the max lower than the number of spawn points
	num_empire_default = ${Math.round(potential_home_stars.length / SPAWNS_PER_MAX_AI_EMPIRE / 2)}
	`;

	let size_based_settings = TINY;
	if (stars.length >= 400) size_based_settings = SMALL;
	if (stars.length >= 600) size_based_settings = MEDIUM;
	if (stars.length >= 800) size_based_settings = LARGE;
	if (stars.length >= 1000) size_based_settings = HUGE;

	const fallen_empire_spawns: { star: [number, number]; direction: 'n' | 'e' | 's' | 'w' }[] = [];
	for (const star of stars) {
		for (const direction of ['n', 'e', 's', 'w'] as const) {
			if (
				can_spawn_fallen_empire_in_direction(
					star,
					direction,
					stars,
					fallen_empire_spawns.map((fe) => get_fallen_empire_origin(fe.star, fe.direction)),
				)
			) {
				fallen_empire_spawns.push({ star, direction });
			}
		}
	}

	const key_to_id = Object.fromEntries(stars.map((coords, i) => [coords.toString(), i]));

	const systems_1_jump_from_spawn = new Set(
		connections.flatMap(([from, to]) => {
			const from_is_spawn = potential_home_stars.includes(from.toString());
			const to_is_spawn = potential_home_stars.includes(to.toString());
			if (from_is_spawn && !to_is_spawn) return [to.toString()];
			if (to_is_spawn && !from_is_spawn) return [from.toString()];
			return [];
		}),
	);
	const systems_2_jumps_from_spawn = new Set(
		connections.flatMap(([from, to]) => {
			const from_is_spawn = potential_home_stars.includes(from.toString());
			const to_is_spawn = potential_home_stars.includes(to.toString());
			const from_is_adjacent = systems_1_jump_from_spawn.has(from.toString());
			const to_is_adjacent = systems_1_jump_from_spawn.has(to.toString());
			if (from_is_adjacent && !to_is_adjacent && !to_is_spawn) return [to.toString()];
			if (to_is_adjacent && !from_is_adjacent && !from_is_spawn) return [from.toString()];
			return [];
		}),
	);

	const systems_entries = stars
		.map((star, i) => {
			const basics = `id = "${key_to_id[star.toString()]}" position = { x = ${-(star[0] - WIDTH / 2)} y = ${star[1] - HEIGHT / 2} }`;

			let initializer = '';
			let spawn_weight = '';
			if (potential_home_stars.includes(star.toString())) {
				initializer = `initializer = random_empire_init_0${(i % 6) + 1}`;
				const params = preferred_home_stars.includes(star.toString())
					? `|PREFERRED|yes|RANDOM_MODULO|${preferred_home_stars.length}|RANDOM_VALUE|${preferred_home_stars.indexOf(star.toString())}|`
					: `|RANDOM_MODULO|10|RANDOM_VALUE|${i % 10}|`;
				spawn_weight = `spawn_weight = { base = 0 add = value:painted_galaxy_spawn_weight${params} }`;
			} else if (systems_1_jump_from_spawn.has(star.toString())) {
				// all systems with 1 of a spawn point get a random basic initializer
				// this mimics the effect of the "empire_cluster" flag in a random galaxy
				initializer = `initializer = ${get_random_system_basic_system_initializer()}`;
			} else if (systems_2_jumps_from_spawn.has(star.toString())) {
				// in a random galaxy, all systems within 2 of a spawn also get the "empire_cluster" effect
				// however, not all spawn points will actually be used, so we don't want to overly restrict system spawns, so a random chance is used
				// the chance is based on the number systems within 2 jumps of a spawn point, so it scaled inversely with the connectedness and number of spawns
				// eg on a low connectivity map, systems within 2 are more likely to get a basic init; this helps empires not get boxed in by hostile creatures etc
				const num_basic_systems =
					potential_home_stars.length +
					systems_1_jump_from_spawn.size +
					systems_2_jumps_from_spawn.size;
				const chance = 1 - num_basic_systems / stars.length;
				if (Math.random() < chance) {
					initializer = `initializer = ${get_random_system_basic_system_initializer()}`;
				}
			}

			const this_star_fallen_empire_spawns = fallen_empire_spawns.filter((fe) => fe.star === star);
			const fe_spawn_effect =
				this_star_fallen_empire_spawns.length > 0
					? `set_star_flag = painted_galaxy_fe_spawn ${this_star_fallen_empire_spawns.map((fe) => `set_star_flag = painted_galaxy_fe_spawn_${fe.direction}`).join(' ')}`
					: '';

			const wohmhole_index = wormholes.findIndex(
				(wh) => are_points_equal(star, wh[0]) || are_points_equal(star, wh[1]),
			);
			const wormhole_effect =
				wohmhole_index >= 0 ? `set_star_flag = painted_galaxy_wormhole_${wohmhole_index}` : '';

			const effects = [fe_spawn_effect, wormhole_effect];
			const effect = effects.some(Boolean) ? `effect = { ${effects.join(' ')} }` : '';
			return `\tsystem = { ${basics} ${initializer} ${spawn_weight} ${effect} }`;
		})
		.join('\n');

	const hyperlanes_entries = connections
		.map(
			([a, b]) =>
				`\tadd_hyperlane = { from = "${key_to_id[a.toString()]}" to = "${key_to_id[b.toString()]}" }`,
		)
		.join('\n');

	// find groups of overlapping nebulas, so we can treat them as a single non-circular nebula
	// (only the largest nebula in each groups gets a name on the map, the rest are given a blank name)
	let nebula_groups: [number, number, number][][] = [];
	for (const nebula of nebulas) {
		const overlapping_groups = nebula_groups.filter((group) =>
			group.some(
				(group_nebula) =>
					Math.hypot(group_nebula[0] - nebula[0], group_nebula[1] - nebula[1]) <
					group_nebula[2] + nebula[2],
			),
		);
		if (overlapping_groups.length === 0) {
			// create new group containing just this nebula
			nebula_groups.push([nebula]);
		} else if (overlapping_groups.length === 1) {
			// add to group
			overlapping_groups[0].push(nebula);
		} else {
			// remove the overlapping groups
			nebula_groups = nebula_groups.filter((group) => !overlapping_groups.includes(group));
			// create a new group combining the overlapping groups and this nebula
			nebula_groups.push([...overlapping_groups.flat(), nebula]);
		}
	}
	// sort nebulas in each group by size
	nebula_groups.forEach((group) => group.sort((a, b) => b[2] - a[2]));
	const nebula_entries = nebula_groups
		.flatMap((group) =>
			group.map(
				([x, y, r], i) =>
					`\tnebula = { ${i !== 0 ? 'name = " "' : ''} position = { x = ${-(x - WIDTH / 2)} y = ${y - HEIGHT / 2} } radius = ${r} }`,
			),
		)
		.join('\n');

	return [
		`static_galaxy_scenario = {`,
		`\tname="${name}"`,
		COMMON,
		ai_empire_settings,
		size_based_settings,
		systems_entries,
		hyperlanes_entries,
		nebula_entries,
		'}',
	].join('\n\n');
}

export function calc_num_starting_stars(stars: [number, number][]) {
	// 6 per 200 is the vanilla num_empires max, but somethings cause additional empires to spawn (players, some origins), so lets increase by 50%
	return Math.round((stars.length / 200) * 6 * SPAWNS_PER_MAX_AI_EMPIRE);
}

function get_fallen_empire_origin(
	star: [number, number],
	direction: 'n' | 's' | 'e' | 'w',
): [number, number] {
	switch (direction) {
		case 'n':
			return [star[0], star[1] - FALLEN_EMPIRE_SPAWN_RADIUS];
		case 's':
			return [star[0], star[1] + FALLEN_EMPIRE_SPAWN_RADIUS];
		case 'e':
			return [star[0] + FALLEN_EMPIRE_SPAWN_RADIUS, star[1]];
		case 'w':
			return [star[0] - FALLEN_EMPIRE_SPAWN_RADIUS, star[1]];
	}
}

function can_spawn_fallen_empire_in_direction(
	star: [number, number],
	direction: 'n' | 's' | 'e' | 'w',
	stars: [number, number][],
	fallen_empire_spawns: [number, number][],
) {
	const origin = get_fallen_empire_origin(star, direction);
	// origin is not near edge of canvas
	if (
		origin[0] < FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin[0] > WIDTH - FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin[1] < FALLEN_EMPIRE_SPAWN_RADIUS ||
		origin[1] > HEIGHT - FALLEN_EMPIRE_SPAWN_RADIUS
	)
		return false;
	// spawn area does not contain any stars or overlap with another fallen empire spawn area
	return (
		stars.every(
			(point) =>
				Math.hypot(point[0] - origin[0], point[1] - origin[1]) >= FALLEN_EMPIRE_SPAWN_RADIUS,
		) &&
		fallen_empire_spawns.every(
			(point) =>
				Math.hypot(point[0] - origin[0], point[1] - origin[1]) >= FALLEN_EMPIRE_SPAWN_RADIUS * 2,
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
	const index = Math.floor(Math.random() * WEIGHTED_MISC_SYSTEM_INITIALIZERS.length);
	return WEIGHTED_MISC_SYSTEM_INITIALIZERS[index];
}
