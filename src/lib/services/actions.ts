import type {
	Action,
	CreateHyperlaneAction,
	CreateSolarSystemAction,
	DeleteHyperlaneAction,
	DeleteSolarSystemAction,
} from '$lib/models/action';
import { Project } from '$lib/models/project';
import {
	Context,
	Effect,
	Equal,
	HashSet,
	Iterable,
	Layer,
	Match,
	pipe,
} from 'effect';

export class Actions extends Context.Tag('Actions')<
	Actions,
	{
		apply_actions(project: Project, actions: Action[]): Effect.Effect<Project>;
		undo_actions(project: Project, actions: Action[]): Effect.Effect<Project>;
	}
>() {
	static readonly layer = Layer.succeed(
		Actions,
		Actions.of({
			apply_actions(project, actions) {
				// TODO simplify actions
				// TODO validate action
				let updated_project = project;
				const BULKABLE_ACTIONS: Set<Action['_tag']> = new Set([
					'CreateSolarSystemAction',
					'DeleteSolarSystemAction',
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
							UpdateSolarSystemAction: (action) => {
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.map(
										(solar_system) =>
											solar_system.id === action.new_value.id ?
												action.new_value
											:	solar_system,
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
						}),
					);
				}
				return Effect.succeed(updated_project);
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
