import { Array, Iterable, Option, Order, pipe, Record, Schema } from 'effect';
import { Connection } from './connection';
import { Nebula } from './nebula';
import { SolarSystem, SolarSystemId } from './solar_system';
import { GeneratorSettings } from './generator_settings';
import { make_blank_image } from '$lib/canvas';
import { GridConfig } from './grid_config';
import { convert_blob_to_data_url, convert_data_url_to_blob } from '$lib/blob';
import {
	filter_object_entries,
	find_number_entry,
	find_object_entry,
	find_text_entry,
	parse_entries,
	tokenize,
} from '$lib/parse_txt';
import { Coordinate } from './coordinate';

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

	async to_json(): Promise<ProjectJson> {
		const encoded = Schema.encodeSync(Project)(this);
		return {
			...encoded,
			canvas: await convert_blob_to_data_url(encoded.canvas),
		};
	}

	static async from_json(json: ProjectJson): Promise<Project> {
		return Schema.decodeSync(Project)({
			...json,
			canvas: await convert_data_url_to_blob(json.canvas),
		});
	}

	static async from_txt(txt: string): Promise<Project> {
		const entries = parse_entries(tokenize(txt));
		const scenario = find_object_entry(entries, 'static_galaxy_scenario');

		const name = find_text_entry(scenario, 'name') || 'none';
		const step = 'tweak';
		const canvas = await make_blank_image();

		const wormhole_flags: Record<number, Set<SolarSystemId>> = {};

		const solar_systems = pipe(
			filter_object_entries(scenario, 'system'),
			Iterable.map((system) => {
				const id = SolarSystemId.make(
					find_number_entry(system, 'id', { int: true }),
				);

				const coordinate_object = find_object_entry(system, 'position');
				const coordinate = Coordinate.from_stellaris_coordinate(
					new Coordinate({
						x: find_number_entry(coordinate_object, 'x'),
						y: find_number_entry(coordinate_object, 'y'),
					}),
				);

				const spawn_weight_json_string = JSON.stringify(
					system.find((entry) => entry[0] === 'spawn_weight'),
				);
				const spawn_type =
					spawn_weight_json_string == null ? 'disabled'
					: spawn_weight_json_string.includes('PREFERRED') ? 'preferred'
					: spawn_weight_json_string.includes('RESERVED|a|') ? 'reserved_a'
					: spawn_weight_json_string.includes('RESERVED|b|') ? 'reserved_b'
					: spawn_weight_json_string.includes('RESERVED|c|') ? 'reserved_c'
					: spawn_weight_json_string.includes('RESERVED|d|') ? 'reserved_d'
					: spawn_weight_json_string.includes('RESERVED|e|') ? 'reserved_e'
					: spawn_weight_json_string.includes('RESERVED|f|') ? 'reserved_f'
					: spawn_weight_json_string.includes('RESERVED|g|') ? 'reserved_g'
					: spawn_weight_json_string.includes('RESERVED|h|') ? 'reserved_h'
					: spawn_weight_json_string.includes('RESERVED|i|') ? 'reserved_i'
					: spawn_weight_json_string.includes('RESERVED|j|') ? 'reserved_j'
					: spawn_weight_json_string.includes('RESERVED|k|') ? 'reserved_k'
					: spawn_weight_json_string.includes('RESERVED|l|') ? 'reserved_l'
					: spawn_weight_json_string.includes('RESERVED|m|') ? 'reserved_m'
					: spawn_weight_json_string.includes('RESERVED|n|') ? 'reserved_n'
					: spawn_weight_json_string.includes('RESERVED|o|') ? 'reserved_o'
					: spawn_weight_json_string.includes('RESERVED|p|') ? 'reserved_p'
					: spawn_weight_json_string.includes('RESERVED|q|') ? 'reserved_q'
					: spawn_weight_json_string.includes('RESERVED|r|') ? 'reserved_r'
					: spawn_weight_json_string.includes('RESERVED|s|') ? 'reserved_s'
					: spawn_weight_json_string.includes('RESERVED|t|') ? 'reserved_t'
					: spawn_weight_json_string.includes('RESERVED|u|') ? 'reserved_u'
					: spawn_weight_json_string.includes('RESERVED|v|') ? 'reserved_v'
					: spawn_weight_json_string.includes('RESERVED|w|') ? 'reserved_w'
					: spawn_weight_json_string.includes('RESERVED|x|') ? 'reserved_x'
					: spawn_weight_json_string.includes('RESERVED|y|') ? 'reserved_y'
					: spawn_weight_json_string.includes('RESERVED|y|') ? 'reserved_y'
					: spawn_weight_json_string.includes('RESERVED|y|') ? 'reserved_y'
					: spawn_weight_json_string.includes('RESERVED|z|') ? 'reserved_z'
					: 'enabled';

				const name = Option.fromNullable(
					find_text_entry(system, 'name') || null,
				);

				const IGNORED_INITIALIZERS = new Set([
					'',
					'random_empire_init_01',
					'random_empire_init_02',
					'random_empire_init_03',
					'random_empire_init_04',
					'random_empire_init_05',
					'random_empire_init_06',
					'basic_init_01',
					'basic_init_02',
					'basic_init_03',
					'basic_init_04',
					'basic_init_05',
					'basic_init_06',
					'asteroid_init_01',
					'binary_init_01',
					'binary_init_02',
					'trinary_init_01',
					'trinary_init_02',
					'special_init_01',
					'special_init_08',
					'special_init_09',
				]);
				const initializer_value = find_text_entry(system, 'initializer');
				const initializer =
					IGNORED_INITIALIZERS.has(initializer_value) ?
						Option.none()
					:	Option.some(initializer_value);

				const effect_json_string = JSON.stringify(
					system.find((entry) => entry[0] === 'effect') ?? [],
				);
				const wormhole_index_match = effect_json_string.match(
					/painted_galaxy_wormhole_(\d+)/,
				);
				if (wormhole_index_match?.[1]) {
					const index = Number.parseInt(wormhole_index_match[1]);
					wormhole_flags[index] = wormhole_flags[index] ?? new Set();
					wormhole_flags[index].add(id);
				}

				return new SolarSystem({
					id,
					coordinate,
					spawn_type,
					name,
					initializer,
				});
			}),
			Array.sortWith((s) => s.id, Order.number),
			Iterable.dedupeAdjacentWith((a, b) => a.id === b.id),
			Array.fromIterable,
		);

		const solar_system_ids = new Set(
			pipe(
				solar_systems,
				Iterable.map((s) => s.id),
			),
		);

		const hyperlanes = pipe(
			filter_object_entries(scenario, 'add_hyperlane'),
			Iterable.map((hyperlane) => {
				return new Connection({
					a: SolarSystemId.make(
						find_number_entry(hyperlane, 'from', { int: true }),
					),
					b: SolarSystemId.make(
						find_number_entry(hyperlane, 'to', { int: true }),
					),
				});
			}),
			Array.sortWith((h) => h.key, Order.string),
			Iterable.dedupeAdjacent,
			Iterable.filter(
				(h) =>
					h.a !== h.b && solar_system_ids.has(h.a) && solar_system_ids.has(h.b),
			),
			Array.fromIterable,
		);

		const wormholes = pipe(
			wormhole_flags,
			Record.values,
			Iterable.filterMap((solar_system_ids) => {
				const [a, b] = Array.fromIterable(solar_system_ids);
				if (a != null && b != null && a !== b) {
					return Option.some(new Connection({ a, b }));
				} else {
					return Option.none();
				}
			}),
			Array.fromIterable,
		);

		const nebulas = pipe(
			filter_object_entries(scenario, 'nebula'),
			Iterable.map((nebula) => {
				const coordinate_object = find_object_entry(nebula, 'position');
				const coordinate = Coordinate.from_stellaris_coordinate(
					new Coordinate({
						x: find_number_entry(coordinate_object, 'x'),
						y: find_number_entry(coordinate_object, 'y'),
					}),
				);
				const radius = find_number_entry(nebula, 'radius');
				return new Nebula({ coordinate, radius });
			}),
			Array.fromIterable,
		);

		return new Project({
			name,
			step,
			canvas,
			solar_systems,
			nebulas,
			hyperlanes,
			wormholes,
		});
	}
}

type Encoded = typeof Project.Encoded;
interface ProjectJson extends Omit<Encoded, 'canvas'> {
	canvas: string;
}
