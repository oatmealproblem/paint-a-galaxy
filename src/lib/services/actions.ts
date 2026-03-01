import type { Action } from '$lib/models/action';
import { Project } from '$lib/models/project';
import { Context, Effect, Equal, Layer, Match } from 'effect';

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
				// TODO bulk apply actions
				let updated_project = project;
				for (const action of actions) {
					Match.value(action).pipe(
						Match.tagsExhaustive({
							SetCanvasAction: (action) => {
								updated_project = new Project({
									...updated_project,
									canvas: action.new_value,
								});
							},
							CreateSolarSystemAction: (action) => {
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.concat([
										action.solar_system,
									]),
								});
							},
							DeleteSolarSystemAction: (action) => {
								updated_project = new Project({
									...updated_project,
									solar_systems: updated_project.solar_systems.filter(
										(solar_system) =>
											solar_system.id !== action.solar_system.id,
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
							CreateHyperlaneAction: (action) => {
								updated_project = new Project({
									...updated_project,
									hyperlanes: updated_project.hyperlanes.concat([
										action.connection,
									]),
								});
							},
							DeleteHyperlaneAction: (action) => {
								updated_project = new Project({
									...updated_project,
									hyperlanes: updated_project.hyperlanes.filter(
										(connection) =>
											!Equal.equals(connection, action.connection),
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
