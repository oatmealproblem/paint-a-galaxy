import { Array, Option, pipe, Schema } from 'effect';
import { Connection } from './connection';
import { Nebula } from './nebula';
import { SolarSystem, SolarSystemId } from './solar_system';
import { GeneratorSettings } from './generator_settings';
import { make_blank_image } from '$lib/canvas';
import { GridConfig } from './grid_config';

export class ProjectListing extends Schema.Class<ProjectListing>(
	'ProjectListing',
)({
	name: Schema.NonEmptyString,
	last_updated: Schema.DateFromString,
}) {
	static from_project(project: Project): ProjectListing {
		return new ProjectListing({
			name: project.name,
			last_updated: new Date(),
		});
	}

	to_json() {
		return { name: this.name, last_updated: this.last_updated.toISOString() };
	}
}

export class Project extends Schema.Class<Project>('Project')({
	name: Schema.NonEmptyString,
	step: Schema.Literal('paint', 'generate', 'tweak').pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 'paint',
			decoding: () => 'paint',
		}),
	),
	canvas: Schema.instanceOf(Blob),
	solar_systems: Schema.Array(SolarSystem),
	nebulas: Schema.Array(Nebula),
	hyperlanes: Schema.Array(Connection),
	wormholes: Schema.Array(Connection),
	generator_settings: GeneratorSettings.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => GeneratorSettings.default(),
			decoding: () => GeneratorSettings.default(),
		}),
	),
	grid_config: GridConfig.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => GridConfig.default(),
			decoding: () => GridConfig.default(),
		}),
	),
}) {
	get_solar_system(id: SolarSystemId): Option.Option<SolarSystem> {
		return pipe(
			this.solar_systems,
			Array.findFirst((solar_system) => solar_system.id === id),
		);
	}

	get_solar_system_unsafe(id: SolarSystemId): SolarSystem {
		return Option.getOrThrow(this.get_solar_system(id));
	}

	static async make_empty(name: string) {
		const canvas = await make_blank_image();

		return Project.make({
			name,
			step: 'paint',
			canvas,
			solar_systems: [],
			nebulas: [],
			hyperlanes: [],
			wormholes: [],
		});
	}
}
