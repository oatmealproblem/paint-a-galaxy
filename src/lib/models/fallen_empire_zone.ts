import { Schema } from 'effect';
import { SolarSystemId } from './solar_system';
import {
	FALLEN_EMPIRE_ZONE_ANGLES,
	FALLEN_EMPIRE_ZONE_DISTANCES,
} from '$lib/constants';
import { convert_degrees_to_radians } from '$lib/math';

export const FallenEmpireZoneId = Schema.UUID.pipe(
	Schema.brand('FallenEmpireZoneId'),
);
export type FallenEmpireZoneId = typeof FallenEmpireZoneId.Type;

export class FallenEmpireZone extends Schema.Class<FallenEmpireZone>(
	'FallenEmpireZone',
)({
	id: FallenEmpireZoneId,
	type: Schema.Literal(
		'random',
		'materialist',
		'spiritualist',
		'xenophobe',
		'xenophile',
		'machine',
		'hive',
	),
	origin: SolarSystemId,
	distance: Schema.Literal(...FALLEN_EMPIRE_ZONE_DISTANCES),
	angle: Schema.Literal(...FALLEN_EMPIRE_ZONE_ANGLES),
	connections: Schema.Array(SolarSystemId),
	fallback_to_random: Schema.Boolean,
}) {
	get radians() {
		return convert_degrees_to_radians(this.angle);
	}
}
