import { Option, Schema } from 'effect';
import { Coordinate } from './coordinate';

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
}) {}
