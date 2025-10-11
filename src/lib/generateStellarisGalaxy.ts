import { Array, Iterable, pipe } from 'effect';

import { FALLEN_EMPIRE_SPAWN_RADIUS, HEIGHT, SPAWNS_PER_MAX_AI_EMPIRE, WIDTH } from './constants';
import { arePointsEqual } from './utils';

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

export function generateStellarisGalaxy(
	name: string,
	stars: [number, number][],
	connections: [[number, number], [number, number]][],
	wormholes: [[number, number], [number, number]][],
	potentialHomeStars: string[],
	preferredHomeStars: string[],
	nebulas: [number, number, number][],
): string {
	const aiEmpireSettings = `
 	num_empires = { min = 0 max = ${Math.round(potentialHomeStars.length / SPAWNS_PER_MAX_AI_EMPIRE)} }	#limits player customization; AI empires don't account for all spawns, so we need to set the max lower than the number of spawn points
	num_empire_default = ${Math.round(potentialHomeStars.length / SPAWNS_PER_MAX_AI_EMPIRE / 2)}
	`;

	let sizeBasedSettings = TINY;
	if (stars.length >= 400) sizeBasedSettings = SMALL;
	if (stars.length >= 600) sizeBasedSettings = MEDIUM;
	if (stars.length >= 800) sizeBasedSettings = LARGE;
	if (stars.length >= 1000) sizeBasedSettings = HUGE;

	const fallenEmpireSpawns: { star: [number, number]; direction: 'n' | 'e' | 's' | 'w' }[] = [];
	for (const star of stars) {
		for (const direction of ['n', 'e', 's', 'w'] as const) {
			if (
				canSpawnFallenEmpireInDirection(
					star,
					direction,
					stars,
					fallenEmpireSpawns.map((fe) => getFallenEmpireOrigin(fe.star, fe.direction)),
				)
			) {
				fallenEmpireSpawns.push({ star, direction });
			}
		}
	}

	const keyToId = Object.fromEntries(stars.map((coords, i) => [coords.toString(), i]));

	const systems1JumpFromSpawn = new Set(
		connections.flatMap(([from, to]) => {
			const fromIsSpawn = potentialHomeStars.includes(from.toString());
			const toIsSpawn = potentialHomeStars.includes(to.toString());
			if (fromIsSpawn && !toIsSpawn) return [to.toString()];
			if (toIsSpawn && !fromIsSpawn) return [from.toString()];
			return [];
		}),
	);
	const systems2JumpsFromSpawn = new Set(
		connections.flatMap(([from, to]) => {
			const fromIsSpawn = potentialHomeStars.includes(from.toString());
			const toIsSpawn = potentialHomeStars.includes(to.toString());
			const fromIsAdjacent = systems1JumpFromSpawn.has(from.toString());
			const toIsAdjacent = systems1JumpFromSpawn.has(to.toString());
			if (fromIsAdjacent && !toIsAdjacent && !toIsSpawn) return [to.toString()];
			if (toIsAdjacent && !fromIsAdjacent && !fromIsSpawn) return [from.toString()];
			return [];
		}),
	);

	const systemsEntries = stars
		.map((star, i) => {
			const basics = `id = "${keyToId[star.toString()]}" position = { x = ${-(star[0] - WIDTH / 2)} y = ${star[1] - HEIGHT / 2} }`;

			let initializer = '';
			let spawnWeight = '';
			if (potentialHomeStars.includes(star.toString())) {
				initializer = `initializer = random_empire_init_0${(i % 6) + 1}`;
				const params = preferredHomeStars.includes(star.toString())
					? `|PREFERRED|yes|RANDOM_MODULO|${preferredHomeStars.length}|RANDOM_VALUE|${preferredHomeStars.indexOf(star.toString())}|`
					: `|RANDOM_MODULO|10|RANDOM_VALUE|${i % 10}|`;
				spawnWeight = `spawn_weight = { base = 0 add = value:painted_galaxy_spawn_weight${params} }`;
			} else if (systems1JumpFromSpawn.has(star.toString())) {
				// all systems with 1 of a spawn point get a random basic initializer
				// this mimics the effect of the "empire_cluster" flag in a random galaxy
				initializer = `initializer = ${getRandomSystemBasicSystemInitializer()}`;
			} else if (systems2JumpsFromSpawn.has(star.toString())) {
				// in a random galaxy, all systems within 2 of a spawn also get the "empire_cluster" effect
				// however, not all spawn points will actually be used, so we don't want to overly restrict system spawns, so a random chance is used
				// the chance is based on the number systems within 2 jumps of a spawn point, so it scaled inversely with the connectedness and number of spawns
				// eg on a low connectivity map, systems within 2 are more likely to get a basic init; this helps empires not get boxed in by hostile creatures etc
				const numBasicSystems =
					potentialHomeStars.length + systems1JumpFromSpawn.size + systems2JumpsFromSpawn.size;
				const chance = 1 - numBasicSystems / stars.length;
				if (Math.random() < chance) {
					initializer = `initializer = ${getRandomSystemBasicSystemInitializer()}`;
				}
			}

			const thisStarFallenEmpireSpawns = fallenEmpireSpawns.filter((fe) => fe.star === star);
			const feSpawnEffect =
				thisStarFallenEmpireSpawns.length > 0
					? `set_star_flag = painted_galaxy_fe_spawn ${thisStarFallenEmpireSpawns.map((fe) => `set_star_flag = painted_galaxy_fe_spawn_${fe.direction}`).join(' ')}`
					: '';

			const wormholeIndex = wormholes.findIndex(
				(wh) => arePointsEqual(star, wh[0]) || arePointsEqual(star, wh[1]),
			);
			const wormholeEffect =
				wormholeIndex >= 0 ? `set_star_flag = painted_galaxy_wormhole_${wormholeIndex}` : '';

			const effects = [feSpawnEffect, wormholeEffect];
			const effect = effects.some(Boolean) ? `effect = { ${effects.join(' ')} }` : '';
			return `\tsystem = { ${basics} ${initializer} ${spawnWeight} ${effect} }`;
		})
		.join('\n');

	const hyperlanesEntries = connections
		.map(
			([a, b]) =>
				`\tadd_hyperlane = { from = "${keyToId[a.toString()]}" to = "${keyToId[b.toString()]}" }`,
		)
		.join('\n');

	// find groups of overlapping nebulas, so we can treat them as a single non-circular nebula
	// (only the largest nebula in each groups gets a name on the map, the rest are given a blank name)
	let nebulaGroups: [number, number, number][][] = [];
	for (const nebula of nebulas) {
		const overlappingGroups = nebulaGroups.filter((group) =>
			group.some(
				(groupNebula) =>
					Math.hypot(groupNebula[0] - nebula[0], groupNebula[1] - nebula[1]) <
					groupNebula[2] + nebula[2],
			),
		);
		if (overlappingGroups.length === 0) {
			// create new group containing just this nebula
			nebulaGroups.push([nebula]);
		} else if (overlappingGroups.length === 1) {
			// add to group
			overlappingGroups[0].push(nebula);
		} else {
			// remove the overlapping groups
			nebulaGroups = nebulaGroups.filter((group) => !overlappingGroups.includes(group));
			// create a new group combining the overlapping groups and this nebula
			nebulaGroups.push([...overlappingGroups.flat(), nebula]);
		}
	}
	// sort nebulas in each group by size
	nebulaGroups.forEach((group) => group.sort((a, b) => b[2] - a[2]));
	const nebulaEntries = nebulaGroups
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
		aiEmpireSettings,
		sizeBasedSettings,
		systemsEntries,
		hyperlanesEntries,
		nebulaEntries,
		'}',
	].join('\n\n');
}

export function calcNumStartingStars(stars: [number, number][]) {
	// 6 per 200 is the vanilla num_empires max, but somethings cause additional empires to spawn (players, some origins), so lets increase by 50%
	return Math.round((stars.length / 200) * 6 * SPAWNS_PER_MAX_AI_EMPIRE);
}

function getFallenEmpireOrigin(
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

function canSpawnFallenEmpireInDirection(
	star: [number, number],
	direction: 'n' | 's' | 'e' | 'w',
	stars: [number, number][],
	fallenEmpireSpawns: [number, number][],
) {
	const origin = getFallenEmpireOrigin(star, direction);
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
		fallenEmpireSpawns.every(
			(point) =>
				Math.hypot(point[0] - origin[0], point[1] - origin[1]) >= FALLEN_EMPIRE_SPAWN_RADIUS * 2,
		)
	);
}

const WEIGHTED_MISC_SYSTEM_INITALIZERS = pipe(
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
function getRandomSystemBasicSystemInitializer() {
	const index = Math.floor(Math.random() * WEIGHTED_MISC_SYSTEM_INITALIZERS.length);
	return WEIGHTED_MISC_SYSTEM_INITALIZERS[index];
}
