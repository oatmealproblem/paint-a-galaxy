import { Option, Schema } from 'effect';
import { Coordinate } from './coordinate';
import {
	initializer_metadata,
	type InitializerKey,
	type InitializerMetadata,
} from '$lib/data/initializer_metadata';

export const SolarSystemId = Schema.Int.pipe(Schema.brand('SolaySystemId'));
export type SolarSystemId = typeof SolarSystemId.Type;

export class SolarSystem extends Schema.Class<SolarSystem>('SolarSystem')({
	id: SolarSystemId,
	coordinate: Coordinate,
	spawn_type: Schema.Literal(
		'disabled',
		'enabled',
		'preferred',
		'reserved_a',
		'reserved_b',
		'reserved_c',
		'reserved_d',
		'reserved_e',
		'reserved_f',
		'reserved_g',
		'reserved_h',
		'reserved_i',
		'reserved_j',
		'reserved_k',
		'reserved_l',
		'reserved_m',
		'reserved_n',
		'reserved_o',
		'reserved_p',
		'reserved_q',
		'reserved_r',
		'reserved_s',
		'reserved_t',
		'reserved_u',
		'reserved_v',
		'reserved_w',
		'reserved_x',
		'reserved_y',
		'reserved_z',
	).pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 'disabled'),
	),
	name: Schema.OptionFromNullishOr(Schema.String, null).pipe(
		Schema.optional,
		Schema.withDefaults({ constructor: Option.none, decoding: Option.none }),
	),
	initializer: Schema.OptionFromNullishOr(Schema.String, null).pipe(
		Schema.optional,
		Schema.withDefaults({ constructor: Option.none, decoding: Option.none }),
	),
}) {
	get_initializer(): Option.Option<string> {
		return (
				this.spawn_type === 'disabled' ||
					this.#get_initializer_metadata().pipe(
						Option.match({
							onNone: () => true, // assume custom values ok
							onSome: (metadata) => metadata.is_starting_system,
						}),
					)
			) ?
				this.initializer
			:	Option.none();
	}

	get_initializer_metadata(): Option.Option<InitializerMetadata> {
		return this.get_initializer().pipe(
			Option.flatMapNullable(
				(key) => initializer_metadata[key as InitializerKey],
			),
		);
	}

	#get_initializer_metadata(): Option.Option<InitializerMetadata> {
		return this.initializer.pipe(
			Option.flatMapNullable(
				(key) => initializer_metadata[key as InitializerKey],
			),
		);
	}

	get_name(): Option.Option<string> {
		return this.get_initializer().pipe(
			Option.flatMap((initializer) =>
				Option.fromNullable(
					(
						initializer_metadata as Record<
							string,
							InitializerMetadata | null | undefined
						>
					)[initializer],
				),
			),
			Option.match({
				onNone: () => this.name,
				onSome: (metadata) =>
					metadata.name === null ? this.name : Option.some(metadata.name),
			}),
		);
	}
}
