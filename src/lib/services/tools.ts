import {
	CAP_STYLE,
	EMPTY_TOOL_SETTINGS,
	tools,
	ToolSettingId,
	ToolSettings,
	type ToolActionTypePayload,
	type ToolId,
} from '$lib/models/tool';
import { Project } from '$lib/models/project';
import {
	Context,
	Effect,
	Layer,
	Option,
	pipe,
	Schema,
	Record,
	Struct,
	Match,
	Equal,
	Iterable,
	Array,
	Order,
	HashSet,
} from 'effect';
import { Action, type UpdateFallenEmpireZoneAction } from '$lib/models/action';
import { KeyVal } from './key_val';
import getStroke from 'perfect-freehand';
import { Coordinate } from '$lib/models/coordinate';
import {
	CANVAS_HEIGHT,
	CANVAS_WIDTH,
	FALLEN_EMPIRE_ZONE_ANGLES,
	FALLEN_EMPIRE_ZONE_DISTANCES,
	FALLEN_EMPIRE_ZONE_RADIUS,
} from '$lib/constants';
import { draw_stroke } from '$lib/canvas';
import { Connection } from '$lib/models/connection';
import { Nebula } from '$lib/models/nebula';
import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
import {
	FallenEmpireZone,
	FallenEmpireZoneId,
} from '$lib/models/fallen_empire_zone';
import { convert_degrees_to_radians, get_degrees_difference } from '$lib/math';

class ToolsPersistenceError extends Schema.TaggedError<ToolsPersistenceError>(
	'ToolsPersistenceError',
)('ToolsPersistenceError', {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

const ToolMessageType = Schema.Literal('info', 'warning', 'success', 'error');
type ToolMessageType = typeof ToolMessageType.Type;

class ApplyToolResult extends Schema.Class<ApplyToolResult>('ApplyToolResult')({
	actions: Schema.Array(Action),
	message: Schema.optionalWith(
		Schema.OptionFromSelf(
			Schema.Struct({
				type: ToolMessageType,
				text: Schema.String,
			}),
		),
		{ default: () => Option.none() },
	),
}) {
	static info(text: string, actions: Action[]): ApplyToolResult {
		return ApplyToolResult.make({
			actions,
			message: Option.some({ type: 'info' as const, text }),
		});
	}

	static success(text: string, actions: Action[]): ApplyToolResult {
		return ApplyToolResult.make({
			actions,
			message: Option.some({ type: 'success' as const, text }),
		});
	}

	static warning(text: string, actions: Action[]): ApplyToolResult {
		return ApplyToolResult.make({
			actions,
			message: Option.some({ type: 'warning' as const, text }),
		});
	}

	static error(text: string, actions: Action[]): ApplyToolResult {
		return ApplyToolResult.make({
			actions,
			message: Option.some({ type: 'error' as const, text }),
		});
	}

	static noop(text: string): ApplyToolResult {
		return ApplyToolResult.warning(text, []);
	}
}

export class Tools extends Context.Tag('Tools')<
	Tools,
	{
		load_settings<Id extends ToolId>(
			tool_id: Id,
			default_settings: Partial<Record<ToolSettingId, number>>,
		): Effect.Effect<Record<ToolSettingId, number>, ToolsPersistenceError>;

		save_settings<Id extends ToolId>(
			tool_id: Id,
			settings: Record<ToolSettingId, number>,
		): Effect.Effect<void, ToolsPersistenceError>;

		apply_tool<Id extends ToolId>(
			project: Project,
			tool_id: Id,
			settings: Record<ToolSettingId, number>,
			payload: ToolActionTypePayload[(typeof tools)[Id]['action_type']],
			ctx: CanvasRenderingContext2D,
		): Effect.Effect<ApplyToolResult>;

		calculate_path<Id extends ToolId>(
			tool_id: Id,
			settings: Record<ToolSettingId, number>,
			payload: ToolActionTypePayload[(typeof tools)[Id]['action_type']],
		): string;
	}
>() {
	static layer = Layer.effect(
		Tools,
		Effect.gen(function* () {
			const keyval = yield* KeyVal;

			const load_settings: (typeof Tools)['Service']['load_settings'] = (
				tool_id,
				default_settings,
			) =>
				pipe(
					keyval.get(`settings.tools.${tool_id}`, ToolSettings),
					Effect.map((option) =>
						Option.match(option, {
							onSome: (some) =>
								pipe(
									EMPTY_TOOL_SETTINGS,
									Record.map((value, key) =>
										Option.getOrElse(
											some[key],
											() => default_settings[key] ?? value,
										),
									),
								),
							onNone: () => ({
								...EMPTY_TOOL_SETTINGS,
								...default_settings,
							}),
						}),
					),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ToolsPersistenceError.make({
									message: `Unexpected error loading settings for tool "${tool_id}"`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ToolsPersistenceError.make({
									message: `Error parsing saved settings for tool "${tool_id}"`,
									cause: error,
								}),
							),
					}),
				);

			const save_settings: (typeof Tools)['Service']['save_settings'] = (
				tool_id,
				settings,
			) =>
				pipe(
					keyval.set(
						`settings.tools.${tool_id}`,
						pipe(
							settings,
							Struct.pick(...Record.keys(tools[tool_id].default_settings)),
						),
					),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ToolsPersistenceError.make({
									message: `Unexpected error saving settings for tool "${tool_id}"`,
									cause: error,
								}),
							),
					}),
				);

			function calculate_freehand_path(
				coordinates: Coordinate[],
				size: number,
			) {
				const stroke = getStroke(coordinates, {
					size,
					thinning: 0.5,
					streamline: 0.5,
					smoothing: 1,
				}) as [number, number][];
				const first = stroke[0];
				if (first == null) return '';
				return stroke
					.reduce(
						(acc, [x0, y0], i, arr) => {
							const next = arr.at(i + 1);
							if (next == null) return acc;
							const [x1, y1] = next;
							acc.push(` ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`);
							return acc;
						},
						['M ', `${first[0]},${first[1]}`, ' Q'],
					)
					.concat('Z')
					.join('');
			}

			function get_solar_systems_payload(
				payload: ToolActionTypePayload[keyof ToolActionTypePayload],
				settings: Record<ToolSettingId, number>,
				project: Project,
			): SolarSystem[] {
				if (settings.bulk == 0) {
					const coordinate = get_single_payload(payload);
					return project.solar_systems.filter((solar_system) =>
						Equal.equals(solar_system.coordinate, coordinate),
					);
				} else {
					const path = calculate_freehand_path(
						get_multi_payload(payload),
						settings.bulk_brush_size,
					);
					const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
					const ctx = canvas.getContext('2d')!;
					draw_stroke(ctx, path, {
						opacity: 1,
						size: 0, // size only matters for blur
						blur: 0,
						color: '#FFFFFF',
					});
					const image_data = ctx.getImageData(
						0,
						0,
						CANVAS_WIDTH,
						CANVAS_HEIGHT,
					);
					return project.solar_systems.filter(
						(solar_system) =>
							image_data.data[
								solar_system.coordinate.y * CANVAS_WIDTH * 4 +
									solar_system.coordinate.x * 4
							] !== 0,
					);
				}
			}

			function get_single_payload(
				payload: ToolActionTypePayload[keyof ToolActionTypePayload],
			) {
				if (!Array.isArray(payload)) return payload;
				throw Error('Unexpected array tool payload');
			}

			function get_double_payload(
				payload: ToolActionTypePayload[keyof ToolActionTypePayload],
			) {
				if (Array.isArray(payload) && payload.length === 2)
					return payload as [Coordinate, Coordinate];
				throw Error('Unexpected non-2-element-array tool payload');
			}

			function get_multi_payload(
				payload: ToolActionTypePayload[keyof ToolActionTypePayload],
			) {
				if (Array.isArray(payload)) return payload;
				throw Error('Unexpected non-array tool payload');
			}

			// find the origin system, angle, and distance that gets a fallen
			// empire zone center closest to the target coordinate;
			// solar_system_coordinate_overrides allows evaluating systems at
			// coordinates they are about to be moved to
			function find_best_fallen_empire_zone_placement({
				project,
				target,
				denied_origin_ids = new Set(),
				allowed_origin_ids = new Set(),
				solar_system_coordinate_overrides = new Map(),
			}: {
				project: Project;
				target: Coordinate;
				denied_origin_ids?: ReadonlySet<SolarSystemId>;
				allowed_origin_ids?: ReadonlySet<SolarSystemId>;
				solar_system_coordinate_overrides?: ReadonlyMap<
					SolarSystemId,
					Coordinate
				>;
			}): Option.Option<{
				origin: SolarSystemId;
				angle: (typeof FALLEN_EMPIRE_ZONE_ANGLES)[number];
				distance: (typeof FALLEN_EMPIRE_ZONE_DISTANCES)[number];
			}> {
				let best: Option.Option<{
					origin: SolarSystemId;
					angle: (typeof FALLEN_EMPIRE_ZONE_ANGLES)[number];
					distance: (typeof FALLEN_EMPIRE_ZONE_DISTANCES)[number];
				}> = Option.none();
				let best_distance_from_target = Infinity;
				for (const system of project.solar_systems) {
					if (denied_origin_ids.has(system.id)) continue;
					if (
						!allowed_origin_ids.has(system.id) &&
						project.fallen_empire_zones.some(
							(zone) => zone.origin === system.id,
						)
					) {
						// no more than 1 FE zone per system
						continue;
					}
					const coordinate =
						solar_system_coordinate_overrides.get(system.id) ??
						system.coordinate;
					const dx = target.x - coordinate.x;
					const dy = target.y - coordinate.y;
					const raw_distance = Math.hypot(dx, dy);
					const raw_angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
					const distance = FALLEN_EMPIRE_ZONE_DISTANCES.reduce((prev, curr) =>
						Math.abs(curr - raw_distance) < Math.abs(prev - raw_distance) ?
							curr
						:	prev,
					);
					const angle = FALLEN_EMPIRE_ZONE_ANGLES.reduce((prev, curr) =>
						(
							get_degrees_difference(curr, raw_angle) <
							get_degrees_difference(prev, raw_angle)
						) ?
							curr
						:	prev,
					);
					const angle_rad = convert_degrees_to_radians(angle);
					const center = coordinate.get_coordinate_in_direction(
						angle_rad,
						distance,
					);
					const distance_from_target = center.distance_to(target);
					if (
						distance_from_target < best_distance_from_target ||
						(distance_from_target === best_distance_from_target &&
							distance <
								best.pipe(
									Option.map((value) => value.distance),
									Option.getOrElse(() => Infinity),
								))
					) {
						best_distance_from_target = distance_from_target;
						best = Option.some({ origin: system.id, distance, angle });
					}
				}
				return best;
			}

			const calculate_path: (typeof Tools)['Service']['calculate_path'] = (
				tool_id,
				settings,
				payload,
			) =>
				Match.value(tool_id as ToolId).pipe(
					Match.when(Match.is('freehand_draw', 'freehand_erase'), () => {
						return calculate_freehand_path(
							get_multi_payload(payload),
							settings.size,
						);
					}),
					Match.when(
						Match.is(
							'solar_system_delete',
							'solar_system_lock',
							'solar_system_unlock',
						),
						() => {
							if (settings.bulk === 0) return '';
							return calculate_freehand_path(
								get_multi_payload(payload),
								settings.bulk_brush_size,
							);
						},
					),
					Match.when(
						Match.is('circle_draw', 'circle_erase', 'nebula_create'),
						() => {
							const [center, edge] = get_double_payload(payload);
							const radius = center.distance_to(edge);
							return `M ${center.x - radius} ${center.y} a ${radius} ${radius} 0 0 0 ${radius * 2} 0 a ${radius} ${radius} 0 0 0 ${-radius * 2} 0 Z`;
						},
					),
					Match.when(Match.is('ellipse_draw', 'ellipse_erase'), () => {
						const [a, b] = get_double_payload(payload);
						const r2 = settings.size / 2;
						const r1 = Math.hypot(a.x - b.x, a.y - b.y) / 2;
						const angle = Math.atan2(b.y - a.y, b.x - a.x);
						return `M ${a.x} ${a.y} A ${r1} ${r2} ${(angle / Math.PI) * 180} 0 0 ${b.x} ${b.y} A ${r1} ${r2} ${(angle / Math.PI) * 180} 0 0 ${a.x} ${a.y} Z`;
					}),
					Match.when(Match.is('rectangle_draw', 'rectangle_erase'), () => {
						const [a, b] = get_double_payload(payload);
						const x_min = Math.min(a.x, b.x);
						const x_max = Math.max(a.x, b.x);
						const y_min = Math.min(a.y, b.y);
						const y_max = Math.max(a.y, b.y);
						return `M ${x_min} ${y_min} L ${x_max} ${y_min} L ${x_max} ${y_max} L ${x_min} ${y_max} Z`;
					}),
					Match.when(Match.is('line_draw', 'line_erase'), () => {
						const [a, b] = get_double_payload(payload);
						const angle = Math.atan2(b.y - a.y, b.x - a.x);
						const radius = settings.size / 2;
						const p1 = new Coordinate({
							x: a.x + Math.sin(angle) * radius,
							y: a.y - Math.cos(angle) * radius,
						});
						const p2 = new Coordinate({
							x: a.x - Math.sin(angle) * radius,
							y: a.y + Math.cos(angle) * radius,
						});
						const p3 = new Coordinate({
							x: b.x - Math.sin(angle) * radius,
							y: b.y + Math.cos(angle) * radius,
						});
						const p4 = new Coordinate({
							x: b.x + Math.sin(angle) * radius,
							y: b.y - Math.cos(angle) * radius,
						});
						const bevel1 = new Coordinate({
							x: a.x - Math.cos(angle) * radius,
							y: a.y - Math.sin(angle) * radius,
						});
						const bevel2 = new Coordinate({
							x: b.x + Math.cos(angle) * radius,
							y: b.y + Math.sin(angle) * radius,
						});
						if (settings.cap_style === CAP_STYLE.round) {
							return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${radius} ${radius} 0 0 0 ${p4.x} ${p4.y} Z`;
						} else if (settings.cap_style === CAP_STYLE.bevel) {
							return `M ${p1.x} ${p1.y} L ${bevel1.x} ${bevel1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${bevel2.x} ${bevel2.y} L ${p4.x} ${p4.y} Z`;
						} else {
							return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`;
						}
					}),
					Match.when(
						Match.is(
							'hyperlane_toggle',
							'nebula_delete',
							'solar_system_create',
							'solar_system_move',
							'cluster_move',
							'spawn_preferred_toggle',
							'spawn_toggle',
							'wormhole_toggle',
							'fallen_empire_zone_create',
							'fallen_empire_zone_delete',
						),
						() => '',
					),
					Match.exhaustive,
				);

			const apply_tool: (typeof Tools)['Service']['apply_tool'] = (
				project,
				tool_id,
				settings,
				payload,
				ctx,
			) =>
				Match.value(tool_id as ToolId).pipe(
					Match.when(
						Match.is(
							'freehand_draw',
							'freehand_erase',
							'circle_draw',
							'circle_erase',
							'ellipse_draw',
							'ellipse_erase',
							'rectangle_draw',
							'rectangle_erase',
							'line_draw',
							'line_erase',
						),
						(value) =>
							Effect.promise(async () => {
								const path = calculate_path(tool_id, settings, payload);
								const size = Match.value(value).pipe(
									Match.when(Match.is('circle_draw', 'circle_erase'), () => {
										const [center, edge] = get_double_payload(payload);
										const radius = center.distance_to(edge);
										return radius * 2;
									}),
									Match.when(
										Match.is('rectangle_draw', 'rectangle_erase'),
										() => {
											const [a, b] = get_double_payload(payload);
											return Math.min(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
										},
									),
									Match.orElse(() => settings.size),
								);
								draw_stroke(ctx, path, {
									...settings,
									size,
									color: tools[tool_id].render.color,
								});
								const bitmap = await createImageBitmap(
									ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT),
								);
								const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
								canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
								const blob = await canvas.convertToBlob({
									type: 'image/jpeg',
									quality: 1,
								});
								return ApplyToolResult.make({
									actions: [
										Action.SetCanvasAction.make({
											new_value: blob,
											old_value: project.canvas,
										}),
									],
								});
							}),
					),
					Match.when('hyperlane_toggle', () => {
						const [a_coordinate, b_coordinate] = get_double_payload(payload);
						const a_solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, a_coordinate),
						);
						const b_solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, b_coordinate),
						);
						if (a_solar_system && b_solar_system) {
							const connection = Connection.make({
								a: a_solar_system.id,
								b: b_solar_system.id,
							});
							if (project.hyperlanes.some(Equal.equals(connection))) {
								return Effect.succeed(
									ApplyToolResult.make({
										actions: [new Action.DeleteHyperlaneAction({ connection })],
									}),
								);
							} else {
								return Effect.succeed(
									ApplyToolResult.make({
										actions: [new Action.CreateHyperlaneAction({ connection })],
									}),
								);
							}
						} else {
							return Effect.succeed(
								ApplyToolResult.noop('Both endpoints must be solar systems.'),
							);
						}
					}),
					Match.when('nebula_create', () => {
						const [center, edge] = get_double_payload(payload);
						const radius = Math.round(center.distance_to(edge));
						const nebula = new Nebula({
							coordinate: center.to_rounded(),
							radius,
						});
						return Effect.succeed(
							ApplyToolResult.make({
								actions: [new Action.CreateNebulaAction({ nebula })],
							}),
						);
					}),
					Match.when('nebula_delete', () => {
						const coordinate = get_single_payload(payload);
						const nebula = pipe(
							project.nebulas,
							Iterable.filter(
								(nebula) =>
									nebula.coordinate.distance_to(coordinate) <= nebula.radius,
							),
							Array.sortBy(
								Order.mapInput(Order.number, (nebula) =>
									nebula.coordinate.distance_to(coordinate),
								),
							),
							Array.get(0),
						);
						return Option.match(nebula, {
							onSome: (nebula) =>
								Effect.succeed(
									ApplyToolResult.make({
										actions: [new Action.DeleteNebulaAction({ nebula })],
									}),
								),
							onNone: () =>
								Effect.succeed(
									ApplyToolResult.noop('No nebula at this location.'),
								),
						});
					}),
					Match.when('solar_system_create', () => {
						const coordinate = get_single_payload(payload).to_rounded();
						if (
							project.solar_systems.some((solar_system) =>
								Equal.equals(solar_system.coordinate, coordinate),
							)
						) {
							return Effect.succeed(
								ApplyToolResult.noop(
									'A solar system already exists at this location.',
								),
							);
						} else {
							const ids = new Set(project.solar_systems.map(Struct.get('id')));
							const id = pipe(
								Iterable.range(0),
								Iterable.findFirst((id) => !ids.has(SolarSystemId.make(id))),
								Option.getOrThrow,
								SolarSystemId.make,
							);
							const solar_system = new SolarSystem({
								id,
								coordinate,
							});
							return Effect.succeed(
								ApplyToolResult.make({
									actions: [
										new Action.CreateSolarSystemAction({ solar_system }),
									],
								}),
							);
						}
					}),
					Match.when('solar_system_delete', () => {
						const solar_systems = get_solar_systems_payload(
							payload,
							settings,
							project,
						).filter((solar_system) => !solar_system.locked);
						if (solar_systems.length === 0) {
							return Effect.succeed(
								ApplyToolResult.noop(
									'No unlocked solar systems at this location.',
								),
							);
						}
						const solar_system_ids = new Set(
							solar_systems.map((solar_system) => solar_system.id),
						);
						const is_not_deleted = (id: SolarSystemId) => !solar_system_ids.has(id);
						const deleted_hyperlanes = project.hyperlanes.filter(
							(connection) =>
								solar_system_ids.has(connection.a) ||
								solar_system_ids.has(connection.b),
						);
						const deleted_wormholes = project.wormholes.filter(
							(connection) =>
								solar_system_ids.has(connection.a) ||
								solar_system_ids.has(connection.b),
						);
						// fallen empire zones whose origin is deleted are re-homed to
						// a new origin that best preserves their location; if no valid
						// new origin exists, they are deleted; connections to deleted
						// solar systems are removed
						const fallen_empire_zone_actions: Action[] = [];
						const denied_origin_ids = new Set<SolarSystemId>(solar_system_ids);
						for (const zone of project.fallen_empire_zones) {
							if (!solar_system_ids.has(zone.origin)) {
								if (!solar_system_ids.isDisjointFrom(new Set(zone.connections))) {
									fallen_empire_zone_actions.push(
										new Action.UpdateFallenEmpireZoneAction({
											old_value: zone,
											new_value: new FallenEmpireZone({
												...zone,
												connections: zone.connections.filter(is_not_deleted),
											}),
										}),
									);
								}
							} else {
								const target =
									project.get_fallen_empire_zone_coordinate_unsafe(zone);
								const placement = find_best_fallen_empire_zone_placement({
									project,
									target,
									denied_origin_ids,
								});
								if (Option.isNone(placement)) {
									fallen_empire_zone_actions.push(
										new Action.DeleteFallenEmpireZoneAction({ zone }),
									);
								} else {
									denied_origin_ids.add(placement.value.origin);
									fallen_empire_zone_actions.push(
										new Action.UpdateFallenEmpireZoneAction({
											old_value: zone,
											new_value: new FallenEmpireZone({
												...zone,
												...placement.value,
												connections: zone.connections.filter(is_not_deleted),
											}),
										}),
									);
								}
							}
						}
						const delete_actions: Action[] = [
							...deleted_hyperlanes.map(
								(connection) =>
									new Action.DeleteHyperlaneAction({ connection }),
							),
							...deleted_wormholes.map(
								(connection) => new Action.DeleteWormholeAction({ connection }),
							),
							...fallen_empire_zone_actions,
							...solar_systems.map(
								(solar_system) =>
									new Action.DeleteSolarSystemAction({ solar_system }),
							),
						];
						return Effect.succeed(
							settings.bulk !== 0 ?
								ApplyToolResult.info(
									`Deleted ${solar_systems.length} solar ${
										solar_systems.length === 1 ? 'system' : 'systems'
									}`,
									delete_actions,
								)
							:	ApplyToolResult.make({ actions: delete_actions }),
						);
					}),
					Match.when('solar_system_lock', () => {
						const solar_systems = get_solar_systems_payload(
							payload,
							settings,
							project,
						).filter((solar_system) => !solar_system.locked);
						if (solar_systems.length === 0) {
							return Effect.succeed(
								ApplyToolResult.noop(
									'No unlocked solar systems at this location.',
								),
							);
						}
						const update_actions = solar_systems.map((solar_system) => {
							const updated_solar_system = new SolarSystem({
								...solar_system,
								locked: true,
							});
							return new Action.UpdateSolarSystemAction({
								old_value: solar_system,
								new_value: updated_solar_system,
							});
						});
						return Effect.succeed(
							settings.bulk !== 0 ?
								ApplyToolResult.info(
									`Locked ${solar_systems.length} solar ${
										solar_systems.length === 1 ? 'system' : 'systems'
									}`,
									update_actions,
								)
							:	ApplyToolResult.make({ actions: update_actions }),
						);
					}),
					Match.when('solar_system_unlock', () => {
						const solar_systems = get_solar_systems_payload(
							payload,
							settings,
							project,
						).filter((solar_system) => solar_system.locked);
						if (solar_systems.length === 0) {
							return Effect.succeed(
								ApplyToolResult.noop(
									'No locked solar systems at this location.',
								),
							);
						}
						const update_actions = solar_systems.map((solar_system) => {
							const updated_solar_system = new SolarSystem({
								...solar_system,
								locked: false,
							});
							return new Action.UpdateSolarSystemAction({
								old_value: solar_system,
								new_value: updated_solar_system,
							});
						});
						return Effect.succeed(
							settings.bulk !== 0 ?
								ApplyToolResult.info(
									`Unlocked ${solar_systems.length} solar ${
										solar_systems.length === 1 ? 'system' : 'systems'
									}`,
									update_actions,
								)
							:	ApplyToolResult.make({ actions: update_actions }),
						);
					}),
					Match.when('spawn_preferred_toggle', () => {
						const coordinate = get_single_payload(payload).to_rounded();
						const solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, coordinate),
						);
						if (solar_system) {
							const updated_solar_system = new SolarSystem({
								...solar_system,
								spawn_type:
									solar_system.spawn_type === 'preferred' ?
										'disabled'
									:	'preferred',
							});
							return Effect.succeed(
								ApplyToolResult.make({
									actions: [
										new Action.UpdateSolarSystemAction({
											old_value: solar_system,
											new_value: updated_solar_system,
										}),
									],
								}),
							);
						} else {
							return Effect.succeed(
								ApplyToolResult.noop('No solar system at this location.'),
							);
						}
					}),
					Match.when('spawn_toggle', () => {
						const coordinate = get_single_payload(payload).to_rounded();
						const solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, coordinate),
						);
						if (solar_system) {
							const updated_solar_system = new SolarSystem({
								...solar_system,
								spawn_type:
									solar_system.spawn_type === 'disabled' ?
										'enabled'
									:	'disabled',
							});
							return Effect.succeed(
								ApplyToolResult.make({
									actions: [
										new Action.UpdateSolarSystemAction({
											old_value: solar_system,
											new_value: updated_solar_system,
										}),
									],
								}),
							);
						} else {
							return Effect.succeed(
								ApplyToolResult.noop('No solar system at this location.'),
							);
						}
					}),
					Match.when('wormhole_toggle', () => {
						const [a_coordinate, b_coordinate] = get_double_payload(payload);
						const a_solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, a_coordinate),
						);
						const b_solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, b_coordinate),
						);
						if (a_solar_system && b_solar_system) {
							const connection = Connection.make({
								a: a_solar_system.id,
								b: b_solar_system.id,
							});
							if (project.wormholes.some(Equal.equals(connection))) {
								return Effect.succeed(
									ApplyToolResult.make({
										actions: [new Action.DeleteWormholeAction({ connection })],
									}),
								);
							} else {
								// each system can only have 1 wormhole, so remove any wormholes that share a system with the new wormhole
								const overlapping_wormholes = project.wormholes.filter(
									(wormhole) =>
										wormhole.a === connection.a ||
										wormhole.a === connection.b ||
										wormhole.b === connection.a ||
										wormhole.b === connection.b,
								);
								return Effect.succeed(
									ApplyToolResult.make({
										actions: [
											...overlapping_wormholes.map(
												(wormhole) =>
													new Action.DeleteWormholeAction({
														connection: wormhole,
													}),
											),
											new Action.CreateWormholeAction({ connection }),
										],
									}),
								);
							}
						} else {
							return Effect.succeed(
								ApplyToolResult.noop('Both endpoints must be solar systems.'),
							);
						}
					}),
					Match.when('fallen_empire_zone_create', () => {
						const target = get_single_payload(payload);
						const placement = find_best_fallen_empire_zone_placement({
							project,
							target,
						});
						if (Option.isNone(placement))
							return Effect.succeed(
								ApplyToolResult.noop(
									'No solar system available to anchor a Fallen Empire zone.',
								),
							);
						const zone = new FallenEmpireZone({
							id: FallenEmpireZoneId.make(crypto.randomUUID()),
							type: 'random',
							connections: [],
							fallback_to_random: false,
							...placement.value,
						});
						return Effect.succeed(
							ApplyToolResult.make({
								actions: [new Action.CreateFallenEmpireZoneAction({ zone })],
							}),
						);
					}),
					Match.when('fallen_empire_zone_delete', () => {
						const coordinate = get_single_payload(payload);
						for (const zone of project.fallen_empire_zones) {
							const center =
								project.get_fallen_empire_zone_coordinate_unsafe(zone);
							if (
								Math.hypot(center.x - coordinate.x, center.y - coordinate.y) <=
								FALLEN_EMPIRE_ZONE_RADIUS
							) {
								return Effect.succeed(
									ApplyToolResult.make({
										actions: [
											new Action.DeleteFallenEmpireZoneAction({ zone }),
										],
									}),
								);
							}
						}
						return Effect.succeed(
							ApplyToolResult.noop('No Fallen Empire zone at this location.'),
						);
					}),
					Match.when('solar_system_move', () => {
						const [origin, dest] = get_double_payload(payload);
						const solar_system = project.solar_systems.find((s) =>
							Equal.equals(s.coordinate, origin),
						);

						// noop if locked
						if (!solar_system)
							return Effect.succeed(
								ApplyToolResult.noop('No solar system at this location.'),
							);
						if (solar_system.locked)
							return Effect.succeed(
								ApplyToolResult.noop('This solar system is locked.'),
							);
						// noop if not actually moved
						const new_coordinate = Coordinate.make({
							x: dest.x,
							y: dest.y,
						}).to_rounded();
						if (Equal.equals(solar_system.coordinate, new_coordinate))
							return Effect.succeed(
								ApplyToolResult.noop(
									'Solar system is already at this location.',
								),
							);
						// noop if the destination is occupied by another system
						if (
							project.solar_systems.some(
								(s) =>
									s.id !== solar_system.id &&
									Equal.equals(s.coordinate, new_coordinate),
							)
						)
							return Effect.succeed(
								ApplyToolResult.noop(
									'Another solar system is already at this location.',
								),
							);

						const updated_solar_system = new SolarSystem({
							...solar_system,
							coordinate: new_coordinate,
						});
						const actions: Action[] = [
							new Action.UpdateSolarSystemAction({
								old_value: solar_system,
								new_value: updated_solar_system,
							}),
						];
						// update FallenEmpireZone originating from moved system
						const fallen_empire_zone = Iterable.findFirst(
							project.fallen_empire_zones,
							(zone) => zone.origin === solar_system.id,
						);
						if (Option.isSome(fallen_empire_zone)) {
							const zone = fallen_empire_zone.value;
							const target =
								project.get_fallen_empire_zone_coordinate_unsafe(zone);
							const placement = find_best_fallen_empire_zone_placement({
								project,
								target,
								allowed_origin_ids: new Set([solar_system.id]),
								solar_system_coordinate_overrides: new Map([
									[solar_system.id, new_coordinate],
								]),
							});
							if (Option.isSome(placement)) {
								actions.push(
									new Action.UpdateFallenEmpireZoneAction({
										old_value: zone,
										new_value: new FallenEmpireZone({
											...zone,
											...placement.value,
										}),
									}),
								);
							}
						}

						return Effect.succeed(ApplyToolResult.make({ actions }));
					}),
					Match.when('cluster_move', () => {
						const [origin, dest] = get_double_payload(payload);
						const start_system = project.solar_systems.find((s) =>
							Equal.equals(s.coordinate, origin),
						);

						if (!start_system)
							return Effect.succeed(
								ApplyToolResult.noop('No solar system at this location.'),
							);
						if (start_system.locked)
							return Effect.succeed(
								ApplyToolResult.noop('This solar system is locked.'),
							);

						const delta_x = dest.x - origin.x;
						const delta_y = dest.y - origin.y;
						if (delta_x === 0 && delta_y === 0)
							return Effect.succeed(ApplyToolResult.noop('No movement.'));

						const cluster_ids = new Set<SolarSystemId>();
						const queue: SolarSystemId[] = [start_system.id];
						cluster_ids.add(start_system.id);
						const connected_fe_zone_ids = new Set<FallenEmpireZoneId>();

						while (queue.length > 0) {
							const current_id = queue.shift()!;
							for (const hyperlane of project.hyperlanes) {
								let neighbor_id: SolarSystemId | undefined;
								if (hyperlane.a === current_id) neighbor_id = hyperlane.b;
								else if (hyperlane.b === current_id) neighbor_id = hyperlane.a;
								if (neighbor_id != null && !cluster_ids.has(neighbor_id)) {
									cluster_ids.add(neighbor_id);
									queue.push(neighbor_id);
								}
							}
							for (const zone of project.fallen_empire_zones) {
								if (connected_fe_zone_ids.has(zone.id)) continue;
								if (zone.connections.includes(current_id)) {
									connected_fe_zone_ids.add(zone.id);
									for (const id of zone.connections) {
										if (!cluster_ids.has(id)) {
											cluster_ids.add(id);
											queue.push(id);
										}
									}
								}
							}
						}

						const cluster_systems = project.solar_systems.filter((s) =>
							cluster_ids.has(s.id),
						);
						if (cluster_systems.some((s) => s.locked))
							return Effect.succeed(
								ApplyToolResult.noop(
									'This cluster contains a locked solar system.',
								),
							);
						const new_coordinate_by_id = new Map<SolarSystemId, Coordinate>(
							cluster_systems.map((system) => [
								system.id,
								Coordinate.make({
									x: system.coordinate.x + delta_x,
									y: system.coordinate.y + delta_y,
								}).to_rounded(),
							]),
						);

						// noop if any cluster system would land on a non-cluster system
						const occupied_coordinates = HashSet.fromIterable(
							project.solar_systems
								.filter((s) => !cluster_ids.has(s.id))
								.map((s) => s.coordinate),
						);
						if (
							Iterable.some(new_coordinate_by_id.values(), (coordinate) =>
								HashSet.has(occupied_coordinates, coordinate),
							)
						)
							return Effect.succeed(
								ApplyToolResult.noop(
									'The cluster would collide with another solar system.',
								),
							);

						const solar_system_actions = cluster_systems.map(
							(system) =>
								new Action.UpdateSolarSystemAction({
									old_value: system,
									new_value: new SolarSystem({
										...system,
										coordinate: new_coordinate_by_id.get(system.id)!,
									}),
								}),
						);

						const fallen_empire_zone_actions: UpdateFallenEmpireZoneAction[] =
							[];
						const denied_origin_ids = new Set<SolarSystemId>();
						const allowed_origin_ids = new Set<SolarSystemId>();
						// origins claimed by a re-home are denied to later zones, and
						// vacated origins are freed again; resolution is greedy in
						// iteration order, so a swap between two zones only works in
						// one direction
						for (const zone of project.fallen_empire_zones) {
							const has_connection_in_cluster = zone.connections.some((id) =>
								cluster_ids.has(id),
							);
							const origin_in_cluster = cluster_ids.has(zone.origin);
							// 4 cases to consider
							// - connected to cluster and origin in cluster: it will move with its origin, no update needed
							// - not connected to cluster and origin not in cluster: won't move, as desired, no update needed
							// - connected to cluster but origin not in cluster: need to re-home targeting translated center
							// - not connected to cluster but origin in cluster: need to re-home targeting existing center
							if (has_connection_in_cluster !== origin_in_cluster) {
								const zone_center =
									project.get_fallen_empire_zone_coordinate_unsafe(zone);
								const target =
									has_connection_in_cluster ?
										new Coordinate({
											x: zone_center.x + delta_x,
											y: zone_center.y + delta_y,
										})
									:	zone_center;
								const placement = find_best_fallen_empire_zone_placement({
									project,
									target,
									denied_origin_ids,
									allowed_origin_ids: new Set([
										...allowed_origin_ids,
										zone.origin,
									]),
									solar_system_coordinate_overrides: new_coordinate_by_id,
								});
								if (Option.isSome(placement)) {
									if (placement.value.origin !== zone.origin) {
										// claim the new origin
										allowed_origin_ids.delete(placement.value.origin);
										denied_origin_ids.add(placement.value.origin);
										// free up the old origin
										denied_origin_ids.delete(zone.origin);
										allowed_origin_ids.add(zone.origin);
									}
									fallen_empire_zone_actions.push(
										new Action.UpdateFallenEmpireZoneAction({
											old_value: zone,
											new_value: new FallenEmpireZone({
												...zone,
												...placement.value,
											}),
										}),
									);
								}
							}
						}

						const nebula_actions = pipe(
							project.nebulas,
							Iterable.filterMap((nebula) => {
								const overlaps_system = cluster_systems.some(
									(s) =>
										s.coordinate.distance_to(nebula.coordinate) <=
										nebula.radius,
								);
								const overlaps_zone = [...connected_fe_zone_ids].some(
									(zone_id) => {
										const zone = project.fallen_empire_zones.find(
											(z) => z.id === zone_id,
										);
										if (!zone) return false;
										const zone_center =
											project.get_fallen_empire_zone_coordinate_unsafe(zone);
										return (
											zone_center.distance_to(nebula.coordinate) <
											nebula.radius + FALLEN_EMPIRE_ZONE_RADIUS
										);
									},
								);
								if (overlaps_system || overlaps_zone) {
									const new_coordinate = Coordinate.make({
										x: nebula.coordinate.x + delta_x,
										y: nebula.coordinate.y + delta_y,
									}).to_rounded();
									return Option.some(
										new Action.UpdateNebulaAction({
											old_value: nebula,
											new_value: new Nebula({
												...nebula,
												coordinate: new_coordinate,
											}),
										}),
									);
								} else {
									return Option.none();
								}
							}),
							Array.fromIterable,
						);
						return Effect.succeed(
							ApplyToolResult.make({
								actions: [
									...solar_system_actions,
									...fallen_empire_zone_actions,
									...nebula_actions,
								],
							}),
						);
					}),
					Match.exhaustive,
				);

			return Tools.of({
				load_settings,
				save_settings,
				calculate_path,
				apply_tool,
			});
		}),
	);
}
