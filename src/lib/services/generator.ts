import {
	Array,
	Context,
	Effect,
	Function,
	Iterable,
	Layer,
	Option,
	pipe,
	Record,
	Struct,
} from 'effect';
import * as turf from '@turf/turf';
import type { Project } from '$lib/models/project';
import { Action } from '$lib/models/action';
import { convert_blob_to_image_data } from '$lib/canvas';
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	MAX_SYMMETRY_MATCH_DISTANCE,
	NUM_RANDOM_NEBULAS,
	RANDOM_NEBULA_MAX_RADIUS,
	RANDOM_NEBULA_MIN_DISTANCE,
	RANDOM_NEBULA_MIN_RADIUS,
} from '$lib/constants';
import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
import { Coordinate } from '$lib/models/coordinate';
import createGraph, { type Link, type Node } from 'ngraph.graph';
// @ts-expect-error -- no 1st or 3rd party type available
import kruskal from 'ngraph.kruskal';
import { Delaunay } from 'd3-delaunay';
import { Connection } from '$lib/models/connection';
import { Nebula } from '$lib/models/nebula';
import { generate_grid_points } from '$lib/grid';

interface GenerateSolarSystemsResult {
	actions: Action[];
	/** total solar systems after generation, including locked ones kept from before */
	generated_count: number;
	/** target number of solar systems from generator settings */
	requested_count: number;
}

export class Generator extends Context.Tag('Generator')<
	Generator,
	{
		generate_solar_systems(
			project: Project,
		): Effect.Effect<GenerateSolarSystemsResult>;

		generate_hyperlanes(project: Project): Effect.Effect<Action[]>;

		generate_spawns(project: Project): Effect.Effect<Action[]>;

		generate_nebulas(project: Project): Effect.Effect<Action[]>;
	}
>() {
	static layer = (() => {
		function delete_solar_systems(project: Project): Action[] {
			return project.solar_systems
				.filter((solar_system) => !solar_system.locked)
				.map((solar_system) =>
					Action.DeleteSolarSystemAction.make({ solar_system }),
				);
		}

		function delete_hyperlanes(project: Project): Action[] {
			return project.hyperlanes
				.filter(
					(connection) =>
						!project.get_solar_system(connection.a).pipe(
							Option.map(Struct.get('locked')),
							Option.getOrElse(() => false),
						) ||
						!project.get_solar_system(connection.b).pipe(
							Option.map(Struct.get('locked')),
							Option.getOrElse(() => false),
						),
				)
				.map((connection) => Action.DeleteHyperlaneAction.make({ connection }));
		}

		function delete_wormholes(project: Project): Action[] {
			return project.wormholes
				.filter(
					(connection) =>
						!project.get_solar_system(connection.a).pipe(
							Option.map(Struct.get('locked')),
							Option.getOrElse(() => false),
						) ||
						!project.get_solar_system(connection.b).pipe(
							Option.map(Struct.get('locked')),
							Option.getOrElse(() => false),
						),
				)
				.map((connection) => Action.DeleteWormholeAction.make({ connection }));
		}

		function delete_nebulas(project: Project): Action[] {
			return project.nebulas.map((nebula) =>
				Action.DeleteNebulaAction.make({ nebula }),
			);
		}

		function delete_fallen_empire_zones(project: Project): Action[] {
			return project.fallen_empire_zones.map((zone) =>
				Action.DeleteFallenEmpireZoneAction.make({ zone }),
			);
		}

		const generate_solar_systems = (project: Project) =>
			Effect.gen(function* () {
				const { number_of_systems, min_distance_between_systems } =
					project.generator_settings;
				const create_solar_system_actions: Action[] = [];
				const image_data = yield* Effect.promise(() =>
					convert_blob_to_image_data(project.canvas),
				);
				function get_weight_from_image(x: number, y: number) {
					if (x < 0 || y < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
						return 0;
					}
					const index = y * CANVAS_HEIGHT * 4 + x * 4;
					// images should be grayscale, but take average of rgb just in case
					const r = image_data.data[index]! / 255;
					const g = image_data.data[index + 1]! / 255;
					const b = image_data.data[index + 2]! / 255;
					const a = image_data.data[index + 3]! / 255;
					return Math.round(((r + g + b) / 3) * a * 100);
				}

				const { grid_config } = project;
				const grid_points =
					grid_config.snap ?
						generate_grid_points(
							grid_config.type,
							grid_config.size,
							grid_config.rotate,
							grid_config.x_offset,
							grid_config.y_offset,
						)
					:	[];
				const grid_point_keys = new Set(
					grid_points.map((point) => point.to_rounded().key),
				);

				// count image and row alpha totals, to use for random weighted
				let total = 0;
				const rows: { total: number; values: number[] }[] = [];
				const MINIMUM_WEIGHT = 5;
				for (let y = 0; y < CANVAS_HEIGHT; y++) {
					const row = { total: 0, values: [] as number[] };
					rows.push(row);
					for (let x = 0; x < CANVAS_WIDTH; x++) {
						if (!grid_config.snap || grid_point_keys.has(`${x},${y}`)) {
							let value =
								grid_config.snap ?
									// when snapped to grid, collect weight from adjacent pixels
									// this fixes literal edge cases where you'd expect solar systems to generate, but they don't
									Math.round(
										(get_weight_from_image(x - 1, y - 1) +
											get_weight_from_image(x - 1, y) +
											get_weight_from_image(x - 1, y + 1) +
											get_weight_from_image(x, y - 1) +
											get_weight_from_image(x, y) +
											get_weight_from_image(x, y + 1) +
											get_weight_from_image(x + 1, y - 1) +
											get_weight_from_image(x + 1, y) +
											get_weight_from_image(x + 1, y + 1)) /
											9,
									)
								:	get_weight_from_image(x, y); // no snap to grid, just get the one pixel
							if (value < MINIMUM_WEIGHT) value = 0;
							total += value;
							row.total += value;
							row.values.push(value);
						} else {
							row.values.push(0);
						}
					}
				}

				function zero_out_weight(x: number, y: number) {
					const row = rows[y];
					if (row == null) return;
					const value = row.values[x];
					if (value == null) return;
					row.values[x] = 0;
					row.total -= value;
					total -= value;
				}

				function zero_out_weight_at_distance(
					x: number,
					y: number,
					distance: number,
				) {
					for (let dx = -distance; dx <= distance; dx++) {
						for (let dy = -distance; dy <= distance; dy++) {
							if (Math.hypot(dx, dy) <= distance) {
								zero_out_weight(x + dx, y + dy);
							}
						}
					}
				}

				const symmetry_transforms = project.symmetry_config.transforms;

				const locked_solar_systems = project.solar_systems.filter(
					(system) => system.locked,
				);

				// zero out weights near locked systems
				for (const solar_system of locked_solar_systems) {
					zero_out_weight_at_distance(
						solar_system.coordinate.x,
						solar_system.coordinate.y,
						min_distance_between_systems,
					);
				}

				// make copy of original unlocked weights, which symmetric copies can sanity check
				// this fixes rounding/rasterization edge cases
				const original_unlocked_weights = structuredClone(rows);
				function has_or_had_unlocked_weights(coordinate: Coordinate) {
					const DISTANCE = 2;
					for (let dx = -DISTANCE; dx <= DISTANCE; dx++) {
						for (let dy = -DISTANCE; dy <= DISTANCE; dy++) {
							if (
								(original_unlocked_weights[coordinate.y + dy]?.values[
									coordinate.x + dx
								] ?? 0) > 0
							) {
								return true;
							}
						}
					}
					return false;
				}

				const new_id_iterator = project.make_new_solar_system_id_iterator();

				function place_system(root_coordinate: Coordinate): void {
					const coordinates = Array.dedupe([
						root_coordinate,
						...symmetry_transforms
							.map(Function.apply(root_coordinate))
							.map(Coordinate.to_rounded),
					]) as [Coordinate, ...Coordinate[]];
					const too_close_to_each_other = coordinates.some(
						(coordinate) =>
							coordinate !== coordinates[0] &&
							coordinate.distance_to(coordinates[0]) <
								min_distance_between_systems,
					);
					if (too_close_to_each_other) {
						// zero out so we don't try this again
						// note: zero out only these points, not zero_out_weight_at_distance
						for (const coordinate of coordinates) {
							zero_out_weight(coordinate.x, coordinate.y);
						}
					} else {
						for (const coordinate of coordinates) {
							const should_place =
								coordinate.is_in_canvas_bounds() &&
								has_or_had_unlocked_weights(coordinate);
							if (should_place) {
								create_solar_system_actions.push(
									Action.CreateSolarSystemAction.make({
										solar_system: SolarSystem.make({
											coordinate,
											id: new_id_iterator.next().value,
											spawn_type: 'disabled',
										}),
									}),
								);
							}
						}
						for (const coordinate of coordinates) {
							zero_out_weight_at_distance(
								coordinate.x,
								coordinate.y,
								min_distance_between_systems,
							);
						}
					}
				}

				// find random weighted pixels; each placed system is mirrored, so
				// the total count can slightly exceed the requested number
				const target_new_systems =
					number_of_systems - locked_solar_systems.length;
				outer: while (create_solar_system_actions.length < target_new_systems) {
					if (total === 0) {
						// we've used all pixels with nonzero alpha
						break;
					}
					const random = Math.floor(Math.random() * total);
					let current = 0;
					for (let y = 0; y < CANVAS_HEIGHT; y++) {
						const row = rows[y]!;
						if (current + row.total > random) {
							for (let x = 0; x < CANVAS_WIDTH; x++) {
								const value = row.values[x]!;
								if (current + value > random) {
									place_system(Coordinate.make({ x, y }));
									continue outer;
								} else {
									current += value;
								}
							}
						} else {
							current += row.total;
						}
					}
				}
				return {
					actions: [
						...delete_hyperlanes(project),
						...delete_wormholes(project),
						...delete_fallen_empire_zones(project),
						...delete_solar_systems(project),
						...create_solar_system_actions,
					],
					generated_count:
						locked_solar_systems.length + create_solar_system_actions.length,
					requested_count: number_of_systems,
				};
			});

		function generate_hyperlanes(project: Project): Effect.Effect<Action[]> {
			if (project.solar_systems.length < 3) return Effect.succeed([]);

			const locked_hyperlanes_as_line_strings = pipe(
				project.hyperlanes,
				Iterable.filterMap((connection) => {
					const a = project.get_solar_system_unsafe(connection.a);
					const b = project.get_solar_system_unsafe(connection.b);
					if (a.locked && b.locked) {
						return Option.some(
							turf.lineString([
								[a.coordinate.x, a.coordinate.y],
								[b.coordinate.x, b.coordinate.y],
							]),
						);
					} else {
						return Option.none();
					}
				}),
				Array.fromIterable,
			);
			function intersects_with_locked_hyperlane(
				a: SolarSystem,
				b: SolarSystem,
			) {
				return locked_hyperlanes_as_line_strings.some(
					(locked) =>
						turf.lineIntersect(
							locked,
							turf.lineString([
								[a.coordinate.x, a.coordinate.y],
								[b.coordinate.x, b.coordinate.y],
							]),
						).features.length > 0,
				);
			}

			const {
				hyperlane_connectivity,
				hyperlane_max_distance,
				allow_disconnected,
			} = project.generator_settings;
			type LinkData = {
				distance: number;
				is_mst?: boolean;
				checked_for_removal?: boolean;
				a: SolarSystem;
				b: SolarSystem;
			};
			const g = createGraph<
				{ coords: [number, number]; d: number },
				LinkData
			>();
			// generate triangulation
			const delaunay = new Delaunay(
				project.solar_systems.flatMap((system) => [
					system.coordinate.x,
					system.coordinate.y,
				]),
			);
			const coordinate_to_solar_system = Record.fromIterableBy(
				project.solar_systems,
				(solar_system) => solar_system.coordinate.key,
			);
			const render_context = {
				x: 0,
				y: 0,
				moveTo(x: number, y: number) {
					this.x = x;
					this.y = y;
				},
				lineTo(x: number, y: number) {
					const a = coordinate_to_solar_system[`${this.x},${this.y}`];
					const b = coordinate_to_solar_system[`${x},${y}`];
					if (a == null || b == null) return;
					const distance = Math.hypot(this.x - x, this.y - y);
					if (!g.hasNode(a.id))
						g.addNode(a.id, { coords: [this.x, this.y], d: Infinity });
					if (!g.hasNode(b.id))
						g.addNode(b.id, { coords: [x, y], d: Infinity });
					g.addLink(a.id, b.id, {
						distance,
						a,
						b,
					});

					this.x = x;
					this.y = y;
				},
				closePath() {},
			};
			delaunay.render(render_context);

			// a link is symmetric to A-B when the symmetric copy of A and the
			// symmetric copy of B are themselves linked. Symmetric systems are
			// found via the Delaunay triangulation with a small max distance to
			// allow for rounding errors, matching the tweak tools.
			const symmetry_transforms = project.symmetry_config.transforms;
			function find_symmetric_links(link: Link<LinkData>): Link<LinkData>[] {
				const symmetric_links: Link<LinkData>[] = [];
				for (const transform of symmetry_transforms) {
					const a = project.find_closest_solar_system(
						transform(link.data.a.coordinate),
						{ max_distance: MAX_SYMMETRY_MATCH_DISTANCE },
					);
					if (Option.isNone(a)) continue;
					const b = project.find_closest_solar_system(
						transform(link.data.b.coordinate),
						{ max_distance: MAX_SYMMETRY_MATCH_DISTANCE },
					);
					if (Option.isNone(b)) continue;
					// ngraph link keys are ordered, so check both orientations
					const symmetric_link =
						g.getLink(a.value.id, b.value.id) ??
						g.getLink(b.value.id, a.value.id);
					if (symmetric_link != null) {
						symmetric_links.push(symmetric_link);
					}
				}
				return symmetric_links;
			}

			// find minimum spanning tree
			const mst: { fromId: number; toId: number }[] = kruskal(
				g,
				(link: Link<{ distance: number; is_mst?: boolean }>) =>
					link.data.distance,
			);
			for (const tree_link of mst) {
				const link = g.getLink(tree_link.fromId, tree_link.toId);
				if (link) {
					link.data.is_mst = true;
					// symmetric copies of MST links are marked too, to ensure symmetry is maintained
					for (const symmetric_link of find_symmetric_links(link)) {
						symmetric_link.data.is_mst = true;
					}
				}
			}

			// remove links
			// - greater than maxConnectionLength (MST allowed if allowDisconnected)
			// - non-MST removed randomly based on connectedness
			// - between locked systems
			// - crossing locked hyperlanes and not part of MST
			const links: Link<LinkData>[] = [];
			g.forEachLink((link) => {
				links.push(link);
			});
			for (const link of links) {
				if (link.data.a.locked && link.data.b.locked) {
					// both ends are locked; remove this link so it's not duplicated
					// don't do anything with symmetric links; they might not be locked
					// intentionally done before skipping checked_for_removal
					g.removeLink(link);
					continue;
				}

				// a symmetric link's removal decision is made together with the link it mirrors,
				// skip so links already decided are skipped here so we're not re-rolling random chance
				if (link.data.checked_for_removal) continue;

				const symmetric_links = find_symmetric_links(link);
				const remove_group = () => {
					g.removeLink(link);
					for (const symmetric_link of symmetric_links) {
						symmetric_link.data.checked_for_removal = true;
						g.removeLink(symmetric_link);
					}
				};

				if (
					link.data.distance > hyperlane_max_distance &&
					(!link.data.is_mst || allow_disconnected)
				) {
					// link is over max distance and either allow_disconnected or not in MST
					remove_group();
				} else if (
					!link.data.is_mst &&
					intersects_with_locked_hyperlane(link.data.a, link.data.b)
				) {
					// intersects with locked hyperlane and is not part of MST; remove
					remove_group();
				} else if (
					Math.random() > hyperlane_connectivity &&
					!link.data.is_mst
				) {
					// randomly remove non-MST links based on connectivity
					remove_group();
				} else {
					// the random check kept this link; mark the symmetric copies as checked, so the chance isn't rerolled (reducing connectivity)
					for (const symmetric_link of symmetric_links) {
						symmetric_link.data.checked_for_removal = true;
					}
				}
			}

			// make CreateHyperlane actions
			const create_hyperlane_actions: Action[] = [];
			const added = new Set<string>();
			g.forEachLink((link) => {
				const connection = Connection.make({
					a: link.data.a.id,
					b: link.data.b.id,
				});
				if (added.has(connection.key)) return;
				added.add(connection.key);
				create_hyperlane_actions.push(
					Action.CreateHyperlaneAction.make({ connection }),
				);
			});

			return Effect.succeed([
				...delete_hyperlanes(project),
				...create_hyperlane_actions,
			]);
		}

		function generate_spawns(project: Project): Effect.Effect<Action[]> {
			const graph = createGraph<
				{ solar_system: SolarSystem; d: number; is_dead_end: boolean },
				never
			>();
			for (const solar_system of project.solar_systems) {
				graph.addNode(solar_system.id, {
					solar_system,
					d: Infinity,
					is_dead_end: false,
				});
			}
			for (const connection of project.hyperlanes) {
				graph.addLink(connection.a, connection.b);
			}

			// mark dead ends
			function follow_dead_end(
				node: Node<{
					solar_system: SolarSystem;
					d: number;
					is_dead_end: boolean;
				}>,
			) {
				graph.forEachLinkedNode(node.id, (linked_node) => {
					if (
						(linked_node.links?.size ?? 0) <= 2 &&
						!linked_node.data.is_dead_end
					) {
						linked_node.data.is_dead_end = true;
						follow_dead_end(linked_node);
					}
				});
			}
			graph.forEachNode((node) => {
				if (node.links == null || node.links.size == 1) {
					node.data.is_dead_end = true;
					follow_dead_end(node);
				}
			});

			// symmetric copies of a system, found via the delaunay triangulation
			// with a max distance to allow for rounding errors (like the tweak
			// tools)
			const symmetry_transforms = project.symmetry_config.transforms;
			function find_symmetric_systems(
				solar_system: SolarSystem,
			): SolarSystem[] {
				const copies: SolarSystem[] = [];
				const seen = new Set<SolarSystemId>();
				for (const transform of symmetry_transforms) {
					const copy = project.find_closest_solar_system(
						transform(solar_system.coordinate),
						{ max_distance: MAX_SYMMETRY_MATCH_DISTANCE },
					);
					// skip when there's no match, when the symmetric match is the
					// system itself, or when multiple transforms resolve to the
					// same copy (e.g. on the mirror line or at the rotation center)
					if (Option.isNone(copy)) continue;
					if (copy.value.id === solar_system.id) continue;
					if (seen.has(copy.value.id)) continue;
					seen.add(copy.value.id);
					copies.push(copy.value);
				}
				return copies;
			}

			// graph distance (in hyperlane jumps) from a system to every other reachable system
			function distances_from(start: SolarSystem): Map<SolarSystemId, number> {
				const distances = new Map<SolarSystemId, number>([[start.id, 0]]);
				const queue: SolarSystem[] = [start];
				while (queue.length) {
					const s = queue.shift()!;
					const current = distances.get(s.id)!;
					graph.forEachLinkedNode(
						s.id,
						(node) => {
							const neighbor = node.data.solar_system;
							if (!distances.has(neighbor.id)) {
								distances.set(neighbor.id, current + 1);
								queue.push(neighbor);
							}
						},
						false,
					);
				}
				return distances;
			}

			// find home stars
			// 6 per 200 is the vanilla num_empires max
			const total_spawns_target = Math.round(
				(project.solar_systems.length / 200) * 6,
			);
			// locked systems with a spawn count towards the target
			const locked_spawn_systems = project.solar_systems.filter(
				(solar_system) =>
					solar_system.locked && solar_system.spawn_type !== 'disabled',
			);
			const new_spawns = new Set<SolarSystem>();

			const rejected_spawn_systems = new Set<SolarSystem>();
			function is_valid_spawn(solar_system: SolarSystem): boolean {
				return (
					!solar_system.locked &&
					!new_spawns.has(solar_system) &&
					!rejected_spawn_systems.has(solar_system) &&
					!graph.getNode(solar_system.id)?.data.is_dead_end
				);
			}

			// groups whose members are within this many jumps of each other are
			// rejected wholesale, so symmetric spawns don't end up clustered
			const MIN_JUMPS_BETWEEN_SYMMETRIC_SPAWNS = 5;

			// keep placing spawns until the target is reached:
			// each iteration picks the valid system furthest from all current spawns (via a single multi-source Dijkstra),
			// then also spawns its symmetric copies
			while (
				locked_spawn_systems.length + new_spawns.size <
				total_spawns_target
			) {
				// reset distance to inf
				graph.forEachNode((node) => {
					node.data.d = Infinity;
				});
				const edge: SolarSystem[] = [];
				// seed the search from every current spawn
				for (const spawn of [...locked_spawn_systems, ...new_spawns]) {
					const node = graph.getNode(spawn.id);
					if (node == null) continue;
					node.data.d = 0;
					edge.push(spawn);
				}
				let furthest_distance = 0;
				let furthest_systems: SolarSystem[] = [];
				if (edge.length > 0) {
					// modified Dijkstra's to find stars furthest from the spawns
					// (simplified since all edge weights are 1)
					while (edge.length) {
						const s = edge.pop()!;
						graph.forEachLinkedNode(
							s.id,
							(node) => {
								if (node.data.d === Infinity) {
									node.data.d = graph.getNode(s.id)!.data.d + 1;
									edge.unshift(node.data.solar_system);
									if (is_valid_spawn(node.data.solar_system)) {
										if (node.data.d > furthest_distance) {
											furthest_distance = node.data.d;
											furthest_systems = [node.data.solar_system];
										} else if (node.data.d === furthest_distance) {
											furthest_systems.push(node.data.solar_system);
										}
									}
								}
							},
							false,
						);
					}
				}
				// disconnected clusters are never reached by the Dijkstra search
				// (their distance stays Infinity), so pick from those instead of
				// letting the spawns pile up in one cluster. This also covers the
				// "no spawns yet" case, where every system stays unreached.
				const unreached_systems: SolarSystem[] = [];
				graph.forEachNode((node) => {
					if (
						node.data.d === Infinity &&
						is_valid_spawn(node.data.solar_system)
					) {
						unreached_systems.push(node.data.solar_system);
					}
				});
				if (unreached_systems.length > 0) {
					furthest_systems = unreached_systems;
				}
				// no valid (not locked, not spawn, not dead end) systems left
				if (furthest_systems.length === 0) break;
				const chosen =
					furthest_systems[Math.floor(Math.random() * furthest_systems.length)];
				if (chosen == null) break;
				const group = [
					chosen,
					...find_symmetric_systems(chosen).filter(is_valid_spawn),
				];
				// reject the whole group when its members are within a few jumps
				// of each other (e.g. near the symmetry center), so a cluster of
				// symmetric spawns doesn't defeat even spacing. The rejected
				// systems are marked invalid so later iterations don't retry them.
				let group_is_cluster = false;
				for (let i = 0; i < group.length && !group_is_cluster; i++) {
					const distances = distances_from(group[i]!);
					for (let j = i + 1; j < group.length; j++) {
						const distance = distances.get(group[j]!.id);
						if (
							distance != null &&
							distance < MIN_JUMPS_BETWEEN_SYMMETRIC_SPAWNS
						) {
							group_is_cluster = true;
							break;
						}
					}
				}
				if (group_is_cluster) {
					for (const member of group) {
						rejected_spawn_systems.add(member);
					}
					continue;
				}
				for (const member of group) {
					new_spawns.add(member);
				}
			}

			return Effect.succeed(
				pipe(
					project.solar_systems,
					Array.filterMap((solar_system) => {
						const is_new_spawn = new_spawns.has(solar_system);
						if (solar_system.locked) {
							return Option.none();
						} else if (is_new_spawn && solar_system.spawn_type !== 'enabled') {
							return Option.some(
								Action.UpdateSolarSystemAction.make({
									old_value: solar_system,
									new_value: new SolarSystem({
										...solar_system,
										spawn_type: 'enabled',
									}),
								}),
							);
						} else if (
							!is_new_spawn &&
							solar_system.spawn_type !== 'disabled'
						) {
							return Option.some(
								Action.UpdateSolarSystemAction.make({
									old_value: solar_system,
									new_value: new SolarSystem({
										...solar_system,
										spawn_type: 'disabled',
									}),
								}),
							);
						} else {
							return Option.none();
						}
					}),
				),
			);
		}

		function generate_nebulas(project: Project): Effect.Effect<Action[]> {
			const create_nebula_actions: Action[] = [];
			const { symmetry_config } = project;
			const symmetry_transforms = symmetry_config.transforms;
			let potential_solar_systems = project.solar_systems.slice();
			// each iteration places a nebula on a random system and one on each
			// of its symmetric copies, so the total can slightly exceed the
			// requested number
			while (create_nebula_actions.length < NUM_RANDOM_NEBULAS) {
				if (potential_solar_systems.length === 0) break;
				const random_index = Math.floor(
					Math.random() * potential_solar_systems.length,
				);
				const chosen = potential_solar_systems[random_index]!;
				const coordinates = Array.dedupe([
					chosen.coordinate,
					...symmetry_transforms
						.map(Function.apply(chosen.coordinate))
						.map(Coordinate.to_rounded),
				]) as [Coordinate, ...Coordinate[]];
				const too_close_to_each_other = coordinates.some(
					(coordinate) =>
						coordinate !== chosen.coordinate &&
						coordinate.distance_to(chosen.coordinate) <
							RANDOM_NEBULA_MIN_DISTANCE,
				);
				if (too_close_to_each_other) {
					// remove the chosen system so it can't be picked again
					potential_solar_systems = potential_solar_systems.filter(
						(solar_system) => solar_system !== chosen,
					);
				} else {
					const radius =
						RANDOM_NEBULA_MIN_RADIUS +
						Math.floor(
							Math.random() *
								(RANDOM_NEBULA_MAX_RADIUS - RANDOM_NEBULA_MIN_RADIUS),
						);
					for (const coordinate of coordinates) {
						create_nebula_actions.push(
							Action.CreateNebulaAction.make({
								nebula: Nebula.make({
									coordinate,
									radius,
								}),
							}),
						);
					}
					// drop systems too close to any of the new nebulas
					potential_solar_systems = potential_solar_systems.filter(
						(solar_system) =>
							coordinates.every(
								(coordinate) =>
									solar_system.coordinate.distance_to(coordinate) >=
									RANDOM_NEBULA_MIN_DISTANCE,
							),
					);
				}
			}
			return Effect.succeed([
				...delete_nebulas(project),
				...create_nebula_actions,
			]);
		}

		return Layer.succeed(
			Generator,
			Generator.of({
				generate_solar_systems,
				generate_hyperlanes,
				generate_spawns,
				generate_nebulas,
			}),
		);
	})();
}
