import { createContext } from 'svelte';
import type { Step } from './models/step';
import {
	tool_pairs,
	tools,
	type ToolActionTypePayload,
	type ToolId,
	type ToolSettingId,
} from './models/tool';
import { Project, ProjectListing } from './models/project';
import { Effect, Layer, Match, pipe, Record } from 'effect';
import { Projects } from './services/projects';
import { KeyVal } from './services/key_val';
import { Tools } from './services/tools';
import { Actions } from './services/actions';
import type { Action } from './models/action';
import { ViewSettings } from './models/view_settings';
import { View } from './services/view';
import { GeneratorSettings } from './models/generator_settings';
import { Generator } from './services/generator';
import { SolarSystemId } from './models/solar_system';

type EditorLayer = Layer.Layer<Actions | Generator | Projects | Tools | View>;

export class Editor {
	project = $state.raw<Project>()!;
	projects = $state.raw<readonly ProjectListing[]>()!;
	readonly step = $derived(this.project?.step ?? 'paint');
	primary_tool_id = $state<ToolId>('freehand_draw');
	readonly primary_tool = $derived(tools[this.primary_tool_id]);
	secondary_tool_id = $state<ToolId>('freehand_erase');
	readonly secondary_tool = $derived(tools[this.secondary_tool_id]);
	#tool_settings = $state.raw<
		Readonly<Record<ToolId, Readonly<Record<ToolSettingId, number>>>>
	>(
		pipe(
			tools,
			Record.map(() => ({
				blur: 0,
				opacity: 0,
				size: 0,
				cap_style: 0,
			})),
		),
	);
	#view_settings = $state.raw(ViewSettings.default());
	readonly current_step_canvas_opacity = $derived(
		Match.value(this.step).pipe(
			Match.when('paint', () => this.view_settings.canvas_opacity_paint_step),
			Match.when(
				'generate',
				() => this.view_settings.canvas_opacity_generate_step,
			),
			Match.when('tweak', () => this.view_settings.canvas_opacity_tweak_step),
			Match.exhaustive,
		),
	);
	#layer: EditorLayer;
	#done_stack: Action[][] = $state([]);
	#undone_stack: Action[][] = $state([]);
	readonly can_undo = $derived(this.#done_stack.length > 0);
	readonly can_redo = $derived(this.#undone_stack.length > 0);
	warned_solar_system_ids = $state.raw<SolarSystemId[]>([]);

	constructor(
		projects: readonly ProjectListing[],
		project: Project,
		layer: EditorLayer,
		tool_settings: Readonly<
			Record<ToolId, Readonly<Record<ToolSettingId, number>>>
		>,
		view_settings: ViewSettings,
	) {
		this.projects = projects;
		this.project = project;
		this.#layer = layer;
		this.#tool_settings = tool_settings;
		this.#view_settings = view_settings;
		this.#select_tool_pair_for_step();

		$effect.root(() => {
			$effect(() => {
				this.#save_project();
			});
		});
	}

	#select_tool_pair_for_step() {
		this.primary_tool_id =
			tool_pairs.find((pair) => pair.step === this.step)?.primary.id ??
			'freehand_draw';
		this.secondary_tool_id =
			tool_pairs.find((pair) => pair.step === this.step)?.secondary.id ??
			'freehand_erase';
	}

	get view_settings(): ViewSettings {
		return this.#view_settings;
	}

	get tool_settings() {
		return this.#tool_settings;
	}

	update_tool_settings(
		tool_id: ToolId,
		settings: Record<ToolSettingId, number>,
	): Promise<void> {
		this.#tool_settings = {
			...this.#tool_settings,
			[tool_id]: settings,
		};
		const effect = Effect.gen(function* () {
			const tools_service = yield* Tools;
			yield* tools_service.save_settings(tool_id, settings);
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer));
	}

	set_step(step: Step) {
		this.project = new Project({ ...this.project, step });
		this.#select_tool_pair_for_step();
	}

	#save_project() {
		const project = this.project;
		const effect = Effect.gen(function* () {
			const projects_service = yield* Projects;
			yield* projects_service.save(project);
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer));
	}

	static load(): Promise<Editor> {
		const layer = Layer.mergeAll(
			Layer.provide(Projects.layer, KeyVal.layer),
			Layer.provide(Tools.layer, KeyVal.layer),
			Layer.provide(View.layer, KeyVal.layer),
			Actions.layer,
			Generator.layer,
		);
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			let list = yield* projects.list();
			const first = list[0];
			const project =
				first ?
					yield* projects.get(first)
				:	yield* projects.get_legacy_localstorage();
			list = first ? list : [ProjectListing.from_project(project), ...list];

			const tools_service = yield* Tools;
			const tool_settings = yield* Effect.all(
				pipe(
					tools,
					Record.map((tool) =>
						tools_service.load_settings(tool.id, tool.default_settings),
					),
				),
			);

			const view_service = yield* View;
			const view_settings = yield* view_service.load_settings();

			const editor = new Editor(
				list,
				project,
				layer,
				tool_settings,
				view_settings,
			);
			return editor;
		});
		return Effect.runPromise(Effect.provide(effect, layer));
	}

	calculate_path(
		tool_id: ToolId,
		payload: ToolActionTypePayload[keyof ToolActionTypePayload],
	): string {
		const settings = this.tool_settings[tool_id];
		const effect = Effect.gen(function* () {
			const tools_service = yield* Tools;
			return tools_service.calculate_path(tool_id, settings, payload);
		});
		return Effect.runSync(Effect.provide(effect, this.#layer));
	}

	async generate({
		solar_systems = false,
		hyperlanes = false,
		spawns = false,
		nebulas = false,
	}) {
		console.log('Generating...');
		const start = performance.now();
		let project = this.project;
		const all_generator_actions: Action[] = [];

		if (solar_systems) {
			const effect = Effect.gen(function* () {
				const generator_service = yield* Generator;
				const actions =
					yield* generator_service.generate_solar_systems(project);
				const actions_service = yield* Actions;
				const updated_project = yield* actions_service.apply_actions(
					project,
					actions,
				);
				return [updated_project, actions] as const;
			});
			const [updated_project, additional_actions] = await Effect.runPromise(
				Effect.provide(effect, this.#layer),
			);
			project = updated_project;
			all_generator_actions.push(...additional_actions);
		}

		if (hyperlanes) {
			const effect = Effect.gen(function* () {
				const generator_service = yield* Generator;
				const actions = yield* generator_service.generate_hyperlanes(project);
				const actions_service = yield* Actions;
				const updated_project = yield* actions_service.apply_actions(
					project,
					actions,
				);
				return [updated_project, actions] as const;
			});
			const [updated_project, additional_actions] = await Effect.runPromise(
				Effect.provide(effect, this.#layer),
			);
			project = updated_project;
			all_generator_actions.push(...additional_actions);
		}

		if (spawns) {
			const effect = Effect.gen(function* () {
				const generator_service = yield* Generator;
				const actions = yield* generator_service.generate_spawns(project);
				const actions_service = yield* Actions;
				const updated_project = yield* actions_service.apply_actions(
					project,
					actions,
				);
				return [updated_project, actions] as const;
			});
			const [updated_project, additional_actions] = await Effect.runPromise(
				Effect.provide(effect, this.#layer),
			);
			project = updated_project;
			all_generator_actions.push(...additional_actions);
		}

		if (nebulas) {
			const effect = Effect.gen(function* () {
				const generator_service = yield* Generator;
				const actions = yield* generator_service.generate_nebulas(project);
				const actions_service = yield* Actions;
				const updated_project = yield* actions_service.apply_actions(
					project,
					actions,
				);
				return [updated_project, actions] as const;
			});
			const [updated_project, additional_actions] = await Effect.runPromise(
				Effect.provide(effect, this.#layer),
			);
			project = updated_project;
			all_generator_actions.push(...additional_actions);
		}

		this.project = project;
		this.#done_stack.push(all_generator_actions);
		this.#undone_stack = [];
		console.log('Done:', performance.now() - start);
	}

	apply_tool(
		tool_id: ToolId,
		payload: ToolActionTypePayload[keyof ToolActionTypePayload],
		ctx: CanvasRenderingContext2D,
	) {
		const settings = this.#tool_settings[tool_id];
		const project = this.project;
		const effect = Effect.gen(function* () {
			const tools_service = yield* Tools;
			const actions = yield* tools_service.apply_tool(
				project,
				tool_id,
				settings,
				payload,
				ctx,
			);
			return actions;
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(actions) => {
				this.apply_actions(actions);
			},
		);
	}

	apply_actions(actions: Action[], { is_redo = false } = {}) {
		const project = this.project;
		const effect = Effect.gen(function* () {
			const actions_service = yield* Actions;
			const updated_project = yield* actions_service.apply_actions(
				project,
				actions,
			);
			return updated_project;
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(updated_project) => {
				if (!is_redo) {
					this.#done_stack.push(actions);
					this.#undone_stack = [];
				}
				this.project = updated_project;
			},
		);
	}

	undo() {
		const actions = this.#done_stack.pop();
		if (actions == null) throw new Error('No actions to undo.');
		this.#undone_stack.push(actions);
		const project = this.project;
		const effect = Effect.gen(function* () {
			const actions_service = yield* Actions;
			const updated_project = yield* actions_service.undo_actions(
				project,
				actions,
			);
			return updated_project;
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(updated_project) => {
				this.project = updated_project;
			},
		);
	}

	redo() {
		const actions = this.#undone_stack.pop();
		if (actions == null) throw new Error('No actions to redo.');
		this.#done_stack.push(actions);
		this.apply_actions(actions, { is_redo: true });
	}

	async create_project(name: string, defaults?: Project): Promise<void> {
		const project =
			defaults == null ?
				await Project.make_empty(name)
			:	new Project({ ...defaults, name });
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			yield* projects.save(project);
			return yield* projects.list();
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(updated_list) => {
				this.projects = updated_list;
				this.project = project;
				this.#done_stack = [];
				this.#undone_stack = [];
			},
		);
	}

	async delete_project(): Promise<void> {
		const project = this.project;
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			yield* projects.delete(project);
			let list = yield* projects.list();
			const first = list[0];
			const updated_project =
				first ?
					yield* projects.get(first)
				:	yield* Effect.promise(() => Project.make_empty('Painted Galaxy'));
			list =
				first ? list : [ProjectListing.from_project(updated_project), ...list];
			return [updated_project, list] as const;
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			([updated_project, updated_list]) => {
				this.projects = updated_list;
				this.project = updated_project;
				this.#select_tool_pair_for_step();
				this.#done_stack = [];
				this.#undone_stack = [];
			},
		);
	}

	async rename_project(name: string): Promise<void> {
		const project = this.project;
		const updated_project = new Project({
			...project,
			name,
		});
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			yield* projects.delete(project);
			yield* projects.save(updated_project);
			return yield* projects.list();
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(updated_list) => {
				this.projects = updated_list;
				this.project = updated_project;
			},
		);
	}

	async clone_project(name: string): Promise<void> {
		const cloned_project = new Project({
			...this.project,
			name,
		});
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			yield* projects.save(cloned_project);
			return yield* projects.list();
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			(updated_list) => {
				this.projects = updated_list;
				this.project = cloned_project;
			},
		);
	}

	async open_project(project_listing: ProjectListing): Promise<void> {
		const effect = Effect.gen(function* () {
			const projects = yield* Projects;
			const project = yield* projects.get(project_listing);
			const list = yield* projects.list();
			return [project, list] as const;
		});
		return Effect.runPromise(Effect.provide(effect, this.#layer)).then(
			([project, projects]) => {
				this.project = project;
				this.projects = projects;
				this.#select_tool_pair_for_step();
				this.#done_stack = [];
				this.#undone_stack = [];
			},
		);
	}

	update_view_settings(
		partial: Partial<Parameters<typeof ViewSettings.make>[0]>,
	): Promise<void> {
		const original_settings = this.#view_settings;
		const updated_settings = ViewSettings.make({
			...this.#view_settings,
			...partial,
		});
		const effect = Effect.gen(function* () {
			const view_service = yield* View;
			return yield* view_service.save_settings(updated_settings);
		});
		this.#view_settings = updated_settings;
		return Effect.runPromise(Effect.provide(effect, this.#layer)).catch(
			(reason) => {
				this.#view_settings = original_settings;
				throw reason;
			},
		);
	}

	update_generator_settings(
		partial: Partial<Parameters<typeof GeneratorSettings.make>[0]>,
	) {
		this.project = new Project({
			...this.project,
			generator_settings: GeneratorSettings.make({
				...this.project.generator_settings,
				...partial,
			}),
		});
	}
}

export const [get_editor, set_editor] = createContext<() => Editor>();
