import { Array, Context, Effect, Layer, Option, pipe, Record } from 'effect';
import type { Project } from '$lib/models/project';
import { Action } from '$lib/models/action';
import { convert_blob_to_image_data } from '$lib/canvas';
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	NUM_RANDOM_NEBULAS,
	RANDOM_NEBULA_MAX_RADIUS,
	RANDOM_NEBULA_MIN_DISTANCE,
	RANDOM_NEBULA_MIN_RADIUS,
	SPAWNS_PER_MAX_AI_EMPIRE,
} from '$lib/constants';
import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
import { Coordinate } from '$lib/models/coordinate';
import createGraph, { type Link, type Node } from 'ngraph.graph';
// @ts-expect-error -- no 1st or 3rd party type available
import kruskal from 'ngraph.kruskal';
import { Delaunay } from 'd3-delaunay';
import { Connection } from '$lib/models/connection';
import { Nebula } from '$lib/models/nebula';

export class Generator extends Context.Tag('Generator')<
	Generator,
	{
		generate_solar_systems(project: Project): Effect.Effect<Action[]>;

		generate_hyperlanes(project: Project): Effect.Effect<Action[]>;

		generate_spawns(project: Project): Effect.Effect<Action[]>;

		generate_nebulas(project: Project): Effect.Effect<Action[]>;
	}
>() {
	static layer = (() => {
		function delete_solar_systems(project: Project): Action[] {
			return project.solar_systems.map((solar_system) =>
				Action.DeleteSolarSystemAction.make({ solar_system }),
			);
		}

		function delete_hyperlanes(project: Project): Action[] {
			return project.hyperlanes.map((connection) =>
				Action.DeleteHyperlaneAction.make({ connection }),
			);
		}

		function delete_wormholes(project: Project): Action[] {
			return project.wormholes.map((connection) =>
				Action.DeleteWormholeAction.make({ connection }),
			);
		}

		function delete_nebulas(project: Project): Action[] {
			return project.nebulas.map((nebula) =>
				Action.DeleteNebulaAction.make({ nebula }),
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
				function get_weight(x: number, y: number) {
					const index = y * CANVAS_HEIGHT * 4 + x * 4;
					// images should be grayscale, but take average of rgb just in case
					const r = image_data.data[index]! / 255;
					const g = image_data.data[index + 1]! / 255;
					const b = image_data.data[index + 2]! / 255;
					const a = image_data.data[index + 3]! / 255;
					return Math.round(((r + g + b) / 3) * a * 100);
				}

				// count image and row alpha totals, to use for random weighted
				let total = 0;
				const rows: { total: number; values: number[] }[] = [];
				for (let y = 0; y < CANVAS_HEIGHT; y++) {
					const row = { total: 0, values: [] as number[] };
					rows.push(row);
					for (let x = 0; x < CANVAS_WIDTH; x++) {
						const value = get_weight(x, y);
						total += value;
						row.total += value;
						row.values.push(value);
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

				// find a random weighted pixel
				for (let i = 0; i < number_of_systems; i++) {
					if (total === 0) {
						// we've used all pixels with nonzero alpha
						console.warn(
							`Generated ${i} solar systems; no more valid locations`,
						);
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
									create_solar_system_actions.push(
										Action.CreateSolarSystemAction.make({
											solar_system: SolarSystem.make({
												coordinate: Coordinate.make({ x, y }),
												id: SolarSystemId.make(i),
												spawn_type: 'disabled',
											}),
										}),
									);
									// set the random weight to 0 for this coordinate and all coordinates within min_distance_between_systems
									for (
										let dx = -min_distance_between_systems;
										dx <= min_distance_between_systems;
										dx++
									) {
										for (
											let dy = -min_distance_between_systems;
											dy <= min_distance_between_systems;
											dy++
										) {
											if (Math.hypot(dx, dy) <= min_distance_between_systems) {
												zero_out_weight(x + dx, y + dy);
											}
										}
									}
									break;
								} else {
									current += value;
								}
							}
							break;
						} else {
							current += row.total;
						}
					}
				}
				return [
					...delete_hyperlanes(project),
					...delete_wormholes(project),
					...delete_solar_systems(project),
					...create_solar_system_actions,
				];
			});

		function generate_hyperlanes(project: Project): Effect.Effect<Action[]> {
			if (project.solar_systems.length < 3) return Effect.succeed([]);

			const {
				hyperlane_connectivity,
				hyperlane_max_distance,
				allow_disconnected,
			} = project.generator_settings;
			const g = createGraph<
				{ coords: [number, number]; d: number },
				{ distance: number; is_mst?: boolean }
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
					const id_1 = coordinate_to_solar_system[`${this.x},${this.y}`]?.id;
					const id_2 = coordinate_to_solar_system[`${x},${y}`]?.id;
					if (id_1 == null || id_2 == null) return;
					const distance = Math.hypot(this.x - x, this.y - y);
					if (!g.hasNode(id_1))
						g.addNode(id_1, { coords: [this.x, this.y], d: Infinity });
					if (!g.hasNode(id_2))
						g.addNode(id_2, { coords: [x, y], d: Infinity });
					g.addLink(id_1, id_2, { distance });

					this.x = x;
					this.y = y;
				},
				closePath() {},
			};
			delaunay.render(render_context);

			// find minimum spanning tree
			const mst: { fromId: number; toId: number }[] = kruskal(
				g,
				(link: Link<{ distance: number; is_mst?: boolean }>) =>
					link.data.distance,
			);
			for (const tree_link of mst) {
				const link = g.getLink(tree_link.fromId, tree_link.toId);
				if (link) link.data.is_mst = true;
			}

			// remove links
			// - greater than maxConnectionLength (MST allowed if allowDisconnected)
			// - non-MST removed randomly based on connectedness
			const links: Link<{ distance: number; is_mst?: boolean }>[] = [];
			g.forEachLink((link) => {
				links.push(link);
			});
			for (const link of links) {
				if (
					(link.data.distance > hyperlane_max_distance &&
						(!link.data.is_mst || allow_disconnected)) ||
					(Math.random() > hyperlane_connectivity && !link.data.is_mst)
				) {
					g.removeLink(link);
				}
			}

			// make CreateHyperlane actions
			const create_hyperlane_actions: Action[] = [];
			const added = new Set<string>();
			g.forEachLink((link) => {
				const connection = Connection.make({
					a: SolarSystemId.make(link.toId as number),
					b: SolarSystemId.make(link.fromId as number),
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

			// find home stars
			// 6 per 200 is the vanilla num_empires max, but somethings cause additional empires to spawn (players, some origins), so lets increase by 50%
			const num_spawns = Math.round(
				(project.solar_systems.length / 200) * 6 * SPAWNS_PER_MAX_AI_EMPIRE,
			);
			const new_spawns: SolarSystem[] = [];
			const start_index = Math.floor(
				Math.random() * (project.solar_systems.length - num_spawns),
			);
			for (let i = start_index; i < start_index + num_spawns; i++) {
				const solar_system = project.solar_systems[i];
				if (solar_system) new_spawns.push(solar_system);
			}
			// move each to the spawn furthest from all other spawns
			// a single iteration of this seems to be good enough
			new_spawns.forEach((star, index) => {
				// reset distance to inf
				graph.forEachNode((node) => {
					node.data.d = Infinity;
				});
				const edge: SolarSystem[] = [];
				// set distance of other potential homes to 0, and add them to the edge
				new_spawns
					.filter((other) => other !== star)
					.forEach((other) => {
						const node = graph.getNode(other.id);
						node!.data.d = 0;
						edge.push(other);
					});
				let non_dead_end_max_distance = 0;
				let non_dead_end_max_distance_stars: SolarSystem[] = [];
				// modified Dijkstra's to find stars furthest from other home systems
				// (simplified since all edge weights are 1)
				while (edge.length) {
					const s = edge.pop()!;
					graph.forEachLinkedNode(
						s.id,
						(node) => {
							if (node.data.d === Infinity) {
								node.data.d = graph.getNode(s.id)!.data.d + 1;
								edge.unshift(node.data.solar_system);
								if (!node.data.is_dead_end) {
									if (node.data.d > non_dead_end_max_distance) {
										non_dead_end_max_distance = node.data.d;
										non_dead_end_max_distance_stars = [node.data.solar_system];
									} else if (node.data.d === non_dead_end_max_distance) {
										non_dead_end_max_distance_stars.push(
											node.data.solar_system,
										);
									}
								}
							}
						},
						false,
					);
				}
				// move this starting system to the farthest star (random for tie)
				if (
					non_dead_end_max_distance > 0 &&
					non_dead_end_max_distance_stars.length > 0
				) {
					const new_solar_system =
						non_dead_end_max_distance_stars[
							Math.floor(Math.random() * non_dead_end_max_distance_stars.length)
						];
					if (new_solar_system) new_spawns[index] = new_solar_system;
				}
			});

			// new_spawns.length = 0;
			// graph.forEachNode((node) => {
			// 	if (node.data.is_dead_end) new_spawns.push(node.data.solar_system);
			// });

			return Effect.succeed(
				pipe(
					project.solar_systems,
					Array.filterMap((solar_system) => {
						const is_new_spawn = new_spawns.includes(solar_system);
						if (is_new_spawn && solar_system.spawn_type !== 'enabled') {
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
			let potential_solar_systems = project.solar_systems;
			for (let i = 0; i < NUM_RANDOM_NEBULAS; i++) {
				if (potential_solar_systems.length !== 0) {
					const random_index = Math.floor(
						Math.random() * potential_solar_systems.length,
					);
					const nebula = Nebula.make({
						coordinate: potential_solar_systems[random_index]!.coordinate,
						radius:
							RANDOM_NEBULA_MIN_RADIUS +
							Math.floor(
								Math.random() *
									(RANDOM_NEBULA_MAX_RADIUS - RANDOM_NEBULA_MIN_RADIUS),
							),
					});
					create_nebula_actions.push(
						Action.CreateNebulaAction.make({ nebula }),
					);
					potential_solar_systems = potential_solar_systems.filter(
						(star) =>
							star.coordinate.distance_to(nebula.coordinate) >=
							RANDOM_NEBULA_MIN_DISTANCE,
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
