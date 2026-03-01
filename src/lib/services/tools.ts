import {
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
	Number,
} from 'effect';
import { Action } from '$lib/models/action';
import { KeyVal } from './key_val';
import getStroke from 'perfect-freehand';
import type { Coordinate } from '$lib/models/coordinate';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '$lib/constants';
import { draw_stroke } from '$lib/canvas';
import { Connection } from '$lib/models/connection';
import { Nebula } from '$lib/models/nebula';
import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';

export class ToolsPersistenceError extends Schema.TaggedError<ToolsPersistenceError>(
	'ToolsPersistenceError',
)('ToolsPersistenceError', {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

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
		): Effect.Effect<Action[]>;

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

			const null_settings = { blur: 0, opacity: 0, size: 0 };
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
									null_settings,
									Record.map((value, key) =>
										Option.getOrElse(
											some[key],
											() => default_settings[key] ?? value,
										),
									),
								),
							onNone: () => ({
								...null_settings,
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

			const calculate_path: (typeof Tools)['Service']['calculate_path'] = (
				tool_id,
				settings,
				payload,
			) =>
				Match.value(tool_id as ToolId).pipe(
					Match.when(Match.is('freehand_draw', 'freehand_erase'), () => {
						const stroke = getStroke(get_multi_payload(payload), {
							size: settings.size,
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
					}),
					Match.when(
						Match.is('circle_draw', 'circle_erase', 'nebula_create'),
						() => {
							const [center, edge] = get_double_payload(payload);
							const radius = center.distance_to(edge);
							return `M ${center.x - radius} ${center.y} a ${radius} ${radius} 0 0 0 ${radius * 2} 0 a ${radius} ${radius} 0 0 0 ${-radius * 2} 0 Z`;
						},
					),
					Match.when(
						Match.is(
							'hyperlane_toggle',
							'nebula_delete',
							'solar_system_create',
							'solar_system_delete',
							'spawn_preferred_toggle',
							'spawn_toggle',
							'wormhole_toggle',
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
						),
						(value) =>
							Effect.promise(async () => {
								const path = calculate_path(tool_id, settings, payload);
								const size = Match.value(value).pipe(
									Match.when(Match.is('circle_draw', 'circle_erase'), () => {
										const [center, edge] = get_double_payload(payload);
										const radius = center.distance_to(edge);
										return radius;
									}),
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
								return [
									Action.SetCanvasAction.make({
										new_value: blob,
										old_value: project.canvas,
									}),
								];
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
								return Effect.succeed([
									new Action.DeleteHyperlaneAction({ connection }),
								]);
							} else {
								return Effect.succeed([
									new Action.CreateHyperlaneAction({ connection }),
								]);
							}
						} else {
							return Effect.succeed([]);
						}
					}),
					Match.when('nebula_create', () => {
						const [center, edge] = get_double_payload(payload);
						const radius = Math.round(center.distance_to(edge));
						const nebula = new Nebula({
							coordinate: center.to_rounded(),
							radius,
						});
						return Effect.succeed([new Action.CreateNebulaAction({ nebula })]);
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
								Effect.succeed([new Action.DeleteNebulaAction({ nebula })]),
							onNone: () => Effect.succeed([]),
						});
					}),
					Match.when('solar_system_create', () => {
						const coordinate = get_single_payload(payload).to_rounded();
						if (
							project.solar_systems.some((solar_system) =>
								Equal.equals(solar_system.coordinate, coordinate),
							)
						) {
							return Effect.succeed([]);
						} else {
							const id = pipe(
								project.solar_systems,
								Iterable.map((solar_system) => solar_system.id),
								Iterable.reduce(-1, Number.max),
								Number.increment,
								SolarSystemId.make,
							);
							const solar_system = new SolarSystem({
								id,
								coordinate,
							});
							return Effect.succeed([
								new Action.CreateSolarSystemAction({ solar_system }),
							]);
						}
					}),
					Match.when('solar_system_delete', () => {
						const coordinate = get_single_payload(payload).to_rounded();
						const solar_system = project.solar_systems.find((solar_system) =>
							Equal.equals(solar_system.coordinate, coordinate),
						);
						if (solar_system) {
							const is_connection_to_solar_system = (connection: Connection) =>
								connection.a === solar_system.id ||
								connection.b === solar_system.id;
							const hyperlanes = project.hyperlanes.filter(
								is_connection_to_solar_system,
							);
							const wormholes = project.wormholes.filter(
								is_connection_to_solar_system,
							);
							return Effect.succeed([
								...hyperlanes.map(
									(connection) =>
										new Action.DeleteHyperlaneAction({ connection }),
								),
								...wormholes.map(
									(connection) =>
										new Action.DeleteWormholeAction({ connection }),
								),
								new Action.DeleteSolarSystemAction({ solar_system }),
							]);
						} else {
							return Effect.succeed([]);
						}
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
							return Effect.succeed([
								new Action.UpdateSolarSystemAction({
									old_value: solar_system,
									new_value: updated_solar_system,
								}),
							]);
						} else {
							return Effect.succeed([]);
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
							return Effect.succeed([
								new Action.UpdateSolarSystemAction({
									old_value: solar_system,
									new_value: updated_solar_system,
								}),
							]);
						} else {
							return Effect.succeed([]);
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
								return Effect.succeed([
									new Action.DeleteWormholeAction({ connection }),
								]);
							} else {
								// each system can only have 1 wormhole, so remove any wormholes that share a system with the new wormhole
								const overlapping_wormholes = project.wormholes.filter(
									(wormhole) =>
										wormhole.a === connection.a ||
										wormhole.a === connection.b ||
										wormhole.b === connection.a ||
										wormhole.b === connection.b,
								);
								return Effect.succeed([
									...overlapping_wormholes.map(
										(wormhole) =>
											new Action.DeleteWormholeAction({ connection: wormhole }),
									),
									new Action.CreateWormholeAction({ connection }),
								]);
							}
						} else {
							return Effect.succeed([]);
						}
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
