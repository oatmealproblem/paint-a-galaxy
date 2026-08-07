import {
	UpdateFallenEmpireZoneAction,
	UpdateSolarSystemAction,
	type Action,
	type CreateHyperlaneAction,
	type CreateSolarSystemAction,
	type DeleteHyperlaneAction,
	type DeleteSolarSystemAction,
} from '$lib/models/action';
import type { SolarSystemId } from '$lib/models/solar_system';
import { Project } from '$lib/models/project';
import {
	Array,
	Context,
	Effect,
	Equal,
	Function,
	HashSet,
	Iterable,
	Layer,
	Match,
	Option,
	pipe,
	Record,
	Schema,
} from 'effect';

class InvalidActionError extends Schema.TaggedError<InvalidActionError>(
	'InvalidActionError',
)('InvalidActionError', {
	message: Schema.String,
}) {}

function validate_uniqueness(
	items: Iterable<string>,
	message: (duplicated: string, count: number) => string,
): Effect.Effect<void, InvalidActionError> {
	return pipe(
		items,
		Iterable.groupBy(Function.identity),
		Record.values,
		Iterable.findFirst((group) => group.length > 1),
		Option.match({
			onNone: () => Effect.void,
			onSome: (group) =>
				Effect.fail(
					InvalidActionError.make({ message: message(group[0], group.length) }),
				),
		}),
	);
}

function validate_unique_solar_system_ids(
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	return validate_uniqueness(
		Iterable.map(project.solar_systems, (solar_system) =>
			String(solar_system.id),
		),
		(id) => `Multiple solar systems cannot share the ID (${id}).`,
	);
}

function validate_unique_coordinates(
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	return validate_uniqueness(
		Iterable.map(
			project.solar_systems,
			(solar_system) => solar_system.coordinate.key,
		),
		(coordinate) =>
			`Multiple solar systems cannot share the coordinate (${coordinate}).`,
	);
}

function validate_wormhole_uniqueness(
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	return validate_uniqueness(
		pipe(
			project.wormholes,
			Iterable.flatMap((wormhole) => [wormhole.a, wormhole.b]),
			Iterable.map((solar_system_id) => String(solar_system_id)),
		),
		(id, count) =>
			`Solar system (id ${id}) can be an endpoint of at most 1 wormhole, but is an endpoint of ${count}.`,
	);
}

function validate_unique_fallen_empire_zone_ids(
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	return validate_uniqueness(
		Iterable.map(project.fallen_empire_zones, (zone) => zone.id),
		(id) => `Multiple Fallen Empire zones cannot share the ID (${id}).`,
	);
}

function validate_zone_origin_uniqueness(
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	return validate_uniqueness(
		Iterable.map(project.fallen_empire_zones, (zone) => String(zone.origin)),
		(id, count) =>
			`Solar system (id ${id}) can be the origin of at most 1 Fallen Empire zone, but is the origin of ${count}.`,
	);
}

function validate_references(
	label: string,
	ids: Iterable<SolarSystemId>,
	project: Project,
): Effect.Effect<void, InvalidActionError> {
	const system_ids = HashSet.fromIterable(
		project.solar_systems.map((solar_system) => solar_system.id),
	);
	return pipe(
		ids,
		Iterable.findFirst((id) => !HashSet.has(system_ids, id)),
		Option.match({
			onNone: () => Effect.void,
			onSome: (id) =>
				Effect.fail(
					InvalidActionError.make({
						message: `${label} references non-existent solar system (id ${id}).`,
					}),
				),
		}),
	);
}

type Validation = (project: Project) => Effect.Effect<void, InvalidActionError>;

const validate_hyperlane_references: Validation = (project) =>
	validate_references(
		'Hyperlane',
		pipe(
			project.hyperlanes,
			Iterable.flatMap((hyperlane) => [hyperlane.a, hyperlane.b]),
		),
		project,
	);

const validate_wormhole_references: Validation = (project) =>
	validate_references(
		'Wormhole',
		pipe(
			project.wormholes,
			Iterable.flatMap((wormhole) => [wormhole.a, wormhole.b]),
		),
		project,
	);

const validate_zone_origin_references: Validation = (project) =>
	validate_references(
		'Fallen Empire zone origin',
		Iterable.map(project.fallen_empire_zones, (zone) => zone.origin),
		project,
	);

const validate_zone_connection_references: Validation = (project) =>
	validate_references(
		'Fallen Empire zone connection',
		pipe(
			project.fallen_empire_zones,
			Iterable.flatMap((zone) => zone.connections),
		),
		project,
	);

// the validations that can be affected by each action type
const VALIDATIONS_BY_ACTION_TAG: Partial<
	Record<Action['_tag'], readonly Validation[]>
> = {
	CreateSolarSystemAction: [
		validate_unique_solar_system_ids,
		validate_unique_coordinates,
	],
	UpdateSolarSystemAction: [validate_unique_coordinates],
	CreateHyperlaneAction: [validate_hyperlane_references],
	CreateWormholeAction: [
		validate_wormhole_uniqueness,
		validate_wormhole_references,
	],
	CreateFallenEmpireZoneAction: [
		validate_unique_fallen_empire_zone_ids,
		validate_zone_origin_uniqueness,
		validate_zone_origin_references,
		validate_zone_connection_references,
	],
	UpdateFallenEmpireZoneAction: [
		validate_zone_origin_uniqueness,
		validate_zone_origin_references,
		validate_zone_connection_references,
	],
	DeleteSolarSystemAction: [
		validate_hyperlane_references,
		validate_wormhole_references,
		validate_zone_origin_references,
		validate_zone_connection_references,
	],
};

function validate_project_state(
	project: Project,
	action_tags: ReadonlySet<Action['_tag']>,
): Effect.Effect<Project, InvalidActionError> {
	return pipe(
		action_tags,
		Iterable.flatMap((tag) => VALIDATIONS_BY_ACTION_TAG[tag] ?? []),
		Array.fromIterable,
		Array.dedupe,
		Iterable.map((validation) => validation(project)),
		Effect.all,
		Effect.as(project),
	);
}

export class Actions extends Context.Tag('Actions')<
	Actions,
	{
		apply_actions(
			project: Project,
			actions: Action[],
		): Effect.Effect<Project, InvalidActionError>;
		undo_actions(
			project: Project,
			actions: Action[],
		): Effect.Effect<Project, InvalidActionError>;
	}
>() {
	static readonly layer = Layer.succeed(
		Actions,
		Actions.of({
			apply_actions(project, actions) {
				// validate actions (don't update locked except by unlocking; never update IDs)
				for (const action of actions) {
					if (action instanceof UpdateSolarSystemAction) {
						if (action.old_value.locked && action.new_value.locked) {
							return Effect.fail(
								InvalidActionError.make({
									message: `Locked solar system (id ${action.old_value.id}) can only be updated to unlock it.`,
								}),
							);
						}
						if (action.old_value.id !== action.new_value.id) {
							return Effect.fail(
								InvalidActionError.make({
									message: `Solar system update cannot change its ID (${action.old_value.id} -> ${action.new_value.id}).`,
								}),
							);
						}
					}
					if (
						action instanceof UpdateFallenEmpireZoneAction &&
						action.old_value.id !== action.new_value.id
					) {
						return Effect.fail(
							InvalidActionError.make({
								message: `Fallen Empire zone update cannot change its ID (${action.old_value.id} -> ${action.new_value.id}).`,
							}),
						);
					}
				}

				let updated_project = project;
				const action_tags = new Set(actions.map((action) => action._tag));
				const BULKABLE_ACTIONS: Set<Action['_tag']> = new Set([
					'CreateSolarSystemAction',
					'DeleteSolarSystemAction',
					'UpdateSolarSystemAction',
					'CreateHyperlaneAction',
					'DeleteHyperlaneAction',
				]);
				const action_groups = pipe(
					actions,
					Iterable.groupWith(
						(a, b) => a._tag === b._tag && BULKABLE_ACTIONS.has(a._tag),
					),
				);
				// each action group is a non-empty array of the same action type
				// actions types not in BULKABLE_ACTIONS will always be in a single-item array
				for (const action_group of action_groups) {
					Match.value(action_group[0]).pipe(
						Match.tagsExhaustive({
							SetCanvasAction: (action) => {
								updated_project = new Project({
									...updated_project,
									canvas: action.new_value,
								});
							},
							CreateSolarSystemAction: () => {
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.concat(
										(action_group as CreateSolarSystemAction[]).map(
											(action) => action.solar_system,
										),
									),
								});
							},
							DeleteSolarSystemAction: () => {
								const deleted_solar_system_ids = new Set(
									(action_group as DeleteSolarSystemAction[]).map(
										(action) => action.solar_system.id,
									),
								);
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.filter(
										(solar_system) =>
											!deleted_solar_system_ids.has(solar_system.id),
									),
								});
							},
							UpdateSolarSystemAction: () => {
								const updated_solar_system_by_id = Object.fromEntries(
									(action_group as UpdateSolarSystemAction[]).map((action) => [
										action.new_value.id,
										action.new_value,
									]),
								);
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.map(
										(solar_system) =>
											updated_solar_system_by_id[solar_system.id] ??
											solar_system,
									),
								});
							},
							CreateHyperlaneAction: () => {
								updated_project = new Project({
									...updated_project,
									hyperlanes: updated_project.hyperlanes.concat(
										(action_group as CreateHyperlaneAction[]).map(
											(action) => action.connection,
										),
									),
								});
							},
							DeleteHyperlaneAction: () => {
								const deleted_connections = HashSet.fromIterable(
									(action_group as DeleteHyperlaneAction[]).map(
										(action) => action.connection,
									),
								);
								updated_project = new Project({
									...updated_project,
									hyperlanes: updated_project.hyperlanes.filter(
										(connection) =>
											!HashSet.has(deleted_connections, connection),
									),
								});
							},
							CreateWormholeAction: (action) => {
								updated_project = new Project({
									...updated_project,
									wormholes: updated_project.wormholes.concat([
										action.connection,
									]),
								});
							},
							DeleteWormholeAction: (action) => {
								updated_project = new Project({
									...updated_project,
									wormholes: updated_project.wormholes.filter(
										(connection) =>
											!Equal.equals(connection, action.connection),
									),
								});
							},
							CreateNebulaAction: (action) => {
								updated_project = new Project({
									...updated_project,
									nebulas: updated_project.nebulas.concat([action.nebula]),
								});
							},
							DeleteNebulaAction: (action) => {
								updated_project = new Project({
									...updated_project,
									nebulas: updated_project.nebulas.filter(
										(connection) => !Equal.equals(connection, action.nebula),
									),
								});
							},
							UpdateNebulaAction: (action) => {
								updated_project = new Project({
									...updated_project,
									nebulas: updated_project.nebulas.map((nebula) =>
										Equal.equals(nebula, action.old_value) ?
											action.new_value
										:	nebula,
									),
								});
							},
							CreateFallenEmpireZoneAction: (action) => {
								updated_project = new Project({
									...updated_project,
									fallen_empire_zones: [
										...updated_project.fallen_empire_zones,
										action.zone,
									],
								});
							},
							DeleteFallenEmpireZoneAction: (action) => {
								updated_project = new Project({
									...updated_project,
									fallen_empire_zones:
										updated_project.fallen_empire_zones.filter(
											(zone) => !Equal.equals(zone, action.zone),
										),
								});
							},
							UpdateFallenEmpireZoneAction: (action) => {
								updated_project = new Project({
									...updated_project,
									fallen_empire_zones: updated_project.fallen_empire_zones.map(
										(zone) =>
											Equal.equals(zone, action.old_value) ?
												action.new_value
											:	zone,
									),
								});
							},
						}),
					);
				}
				return validate_project_state(updated_project, action_tags);
			},

			undo_actions(project, actions) {
				return this.apply_actions(
					project,
					actions.map((action) => action.invert()).toReversed(),
				);
			},
		}),
	);
}
