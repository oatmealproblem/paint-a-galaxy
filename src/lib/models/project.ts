import { Array, Option, pipe, Schema } from 'effect';
import { Connection } from './connection';
import { Nebula } from './nebula';
import { SolarSystem, SolarSystemId } from './solar_system';
import { GeneratorSettings } from './generator_settings';
import { make_blank_image } from '$lib/canvas';

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
}) {
	get_solar_system(id: SolarSystemId): SolarSystem {
		return pipe(
			this.solar_systems,
			Array.findFirst((solar_system) => solar_system.id === id),
			Option.getOrThrow,
		);
	}

	static async make_empty(name: string) {
		const canvas = await make_blank_image();

		return Project.make({
			name,
			canvas,
			solar_systems: [],
			nebulas: [],
			hyperlanes: [],
			wormholes: [],
		});
	}
}
