import { Project, ProjectListing } from '$lib/models/project';
import {
	Array,
	Context,
	Effect,
	Either,
	Equal,
	HashSet,
	Layer,
	Option,
	pipe,
	Schema,
} from 'effect';
import { KeyVal } from './key_val';
import { Coordinate } from '$lib/models/coordinate';
import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
import { Nebula } from '$lib/models/nebula';
import { Connection } from '$lib/models/connection';
import { make_blank_image } from '$lib/canvas';

export class ProjectPersistenceError extends Schema.TaggedError<ProjectPersistenceError>(
	'ProjectPersistenceError',
)('ProjectPersistenceError', {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

export class Projects extends Context.Tag('Projects')<
	Projects,
	{
		list(): Effect.Effect<readonly ProjectListing[], ProjectPersistenceError>;
		get(
			project: ProjectListing,
		): Effect.Effect<Project, ProjectPersistenceError>;
		save(project: Project): Effect.Effect<void, ProjectPersistenceError>;
		delete(project: Project): Effect.Effect<void, ProjectPersistenceError>;
		get_legacy_localstorage(): Effect.Effect<Project>;
	}
>() {
	static layer = Layer.effect(
		Projects,
		Effect.gen(function* () {
			const keyval = yield* KeyVal;

			function list(): Effect.Effect<
				readonly ProjectListing[],
				ProjectPersistenceError
			> {
				return pipe(
					keyval.get('projects', Schema.Array(ProjectListing)),
					Effect.map((option) =>
						Option.getOrElse(option, () => [] as ProjectListing[]),
					),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Unexpected error loading projects list`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Error parsing saved projects list`,
									cause: error,
								}),
							),
					}),
				);
			}

			const raise_or_insert_project_listing = (project: Project) =>
				Effect.gen(function* () {
					const listings = yield* list();
					const updated = [
						ProjectListing.from_project(project),
						...listings.filter((listing) => listing.name !== project.name),
					];
					yield* keyval.set(
						'projects',
						updated.map((project) => project.to_json()),
					);
				});

			const delete_project_listing = (project: Project) =>
				Effect.gen(function* () {
					const listings = yield* list();
					const updated = listings.filter(
						(listing) => listing.name !== project.name,
					);
					yield* keyval.set(
						'projects',
						updated.map((project) => project.to_json()),
					);
				});

			function get(
				project: ProjectListing,
			): Effect.Effect<Project, ProjectPersistenceError> {
				return pipe(
					keyval.get(`project.${project.name}`, Project),
					Effect.flatMap(
						Option.match({
							onNone: () =>
								Effect.fail(
									ProjectPersistenceError.make({
										message: `Project "${project.name}" not found.`,
										cause: undefined,
									}),
								),
							onSome: (value) => Effect.succeed(value),
						}),
					),
					Effect.tap(raise_or_insert_project_listing),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Unexpected error loading project "${project.name}"`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Error parsing saved project "${project.name}"`,
									cause: error,
								}),
							),
					}),
				);
			}

			function save(
				project: Project,
			): Effect.Effect<void, ProjectPersistenceError> {
				return pipe(
					Effect.succeed(project),
					Effect.tap(raise_or_insert_project_listing),
					Effect.flatMap(Schema.encode(Project)),
					Effect.flatMap((project) =>
						keyval.set(`project.${project.name}`, project),
					),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Unexpected error saving project "${project.name}"`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Error encoding project "${project.name}"`,
									cause: error,
								}),
							),
					}),
				);
			}

			function delete_project(
				project: Project,
			): Effect.Effect<void, ProjectPersistenceError> {
				return pipe(
					Effect.succeed(project),
					Effect.tap(delete_project_listing),
					Effect.flatMap((project) => keyval.delete(`project.${project.name}`)),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ProjectPersistenceError.make({
									message: `Unexpected error saving project "${project.name}"`,
									cause: error,
								}),
							),
					}),
				);
			}

			function get_legacy_localstorage(): Effect.Effect<Project> {
				// legacy canvas was 900x900, not 1000x1000; coordinates need to be offset by 50 to compensate
				const LEGACY_COORDINATE_OFFSET = 50;
				return Effect.promise(async () => {
					const CoordinateFromTuple = Schema.transform(
						Schema.Tuple(Schema.Int, Schema.Int),
						Coordinate,
						{
							strict: true,
							decode: ([x, y]) =>
								Coordinate.make({
									x: x + LEGACY_COORDINATE_OFFSET,
									y: y + LEGACY_COORDINATE_OFFSET,
								}),
							encode: ({ x, y }) =>
								[
									x - LEGACY_COORDINATE_OFFSET,
									y - LEGACY_COORDINATE_OFFSET,
								] as const,
						},
					);

					const CoordinateFromString = Schema.transform(
						Schema.String,
						CoordinateFromTuple,
						{
							strict: true,
							decode: (input: string) =>
								input.split(',').map((s) => parseInt(s)) as [number, number],
							encode: ([x, y]) => `${x},${y}`,
						},
					);

					function get_legacy_localstorage(
						key: string,
						parse: (item: string) => unknown = JSON.parse,
					): unknown {
						const item = localStorage.getItem(`paint-a-galaxy-${key}`);
						return item == null ? null : parse(item);
					}

					const spawn_coordinates = pipe(
						get_legacy_localstorage('potentialHomeStars'),
						Schema.decodeUnknownEither(Schema.Array(CoordinateFromString)),
						Either.getOrElse(() => [] as readonly Coordinate[]),
						HashSet.fromIterable,
					);

					const preferred_spawn_coordinates = pipe(
						get_legacy_localstorage('preferredHomeStars'),
						Schema.decodeUnknownEither(Schema.Array(CoordinateFromString)),
						Either.getOrElse(() => [] as readonly Coordinate[]),
						HashSet.fromIterable,
					);

					const solar_systems = pipe(
						get_legacy_localstorage('stars'),
						Schema.decodeUnknownEither(Schema.Array(CoordinateFromTuple)),
						Either.getOrElse(() => [] as readonly Coordinate[]),
						Array.map((coordinate, index) =>
							SolarSystem.make({
								id: SolarSystemId.make(index),
								coordinate,
								spawn_type:
									HashSet.has(preferred_spawn_coordinates, coordinate) ?
										'preferred'
									: HashSet.has(spawn_coordinates, coordinate) ? 'enabled'
									: 'disabled',
							}),
						),
					);

					const NebulaFromTuple = Schema.transform(
						Schema.Tuple(Schema.Int, Schema.Int, Schema.Int),
						Nebula,
						{
							strict: true,
							decode: ([x, y, r]) =>
								Nebula.make({
									coordinate: Coordinate.make({
										x: x + LEGACY_COORDINATE_OFFSET,
										y: y + LEGACY_COORDINATE_OFFSET,
									}),
									radius: r,
								}),
							encode: (nebula) =>
								[
									nebula.coordinate.x - LEGACY_COORDINATE_OFFSET,
									nebula.coordinate.y - LEGACY_COORDINATE_OFFSET,
									nebula.radius,
								] as const,
						},
					);

					const nebulas = pipe(
						get_legacy_localstorage('nebulas'),
						Schema.decodeUnknownEither(Schema.Array(NebulaFromTuple)),
						Either.getOrElse(() => [] as readonly Nebula[]),
					);

					const get_connections = (unvalidated: unknown) => {
						return pipe(
							unvalidated,
							Schema.decodeUnknownEither(
								Schema.Array(
									Schema.Tuple(CoordinateFromTuple, CoordinateFromTuple),
								),
							),
							Either.getOrElse(
								() => [] as readonly (readonly [Coordinate, Coordinate])[],
							),
							Array.filterMap(([a_coordinate, b_coordinate]) => {
								const a = Array.findFirst(solar_systems, (solar_system) =>
									Equal.equals(solar_system.coordinate, a_coordinate),
								);
								const b = Array.findFirst(solar_systems, (solar_system) =>
									Equal.equals(solar_system.coordinate, b_coordinate),
								);
								if (Option.isSome(a) && Option.isSome(b)) {
									return Option.some(
										Connection.make({ a: a.value.id, b: b.value.id }),
									);
								} else {
									return Option.none();
								}
							}),
						);
					};
					const hyperlanes = get_connections(
						get_legacy_localstorage('connections'),
					);
					const wormholes = get_connections(
						get_legacy_localstorage('wormholes'),
					);

					const name = pipe(
						get_legacy_localstorage('nebulas'),
						Schema.decodeUnknownEither(Schema.NonEmptyString),
						Either.getOrElse(() => 'Painted Galaxy'),
					);

					const base_64_image_data = localStorage.getItem(
						'paint-a-galaxy-canvas',
					);
					const canvas =
						base_64_image_data ?
							await fetch(base_64_image_data).then((resp) => resp.blob())
						:	await make_blank_image();

					return Project.make({
						name,
						canvas,
						solar_systems,
						nebulas,
						hyperlanes,
						wormholes,
					});
				});
			}

			return Projects.of({
				list,
				get,
				save,
				delete: delete_project,
				get_legacy_localstorage,
			});
		}),
	);
}
