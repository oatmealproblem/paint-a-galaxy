import { Schema } from 'effect';
import { SolarSystemId } from './solar_system';

export class FallenEmpireZone extends Schema.Class<FallenEmpireZone>(
	'FallenEmpireZone',
)({
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
	distance: Schema.Literal(30, 40, 50, 60, 70, 80, 90, 100),
	angle: Schema.Literal(0, 45, 90, 135, 180, 225, 270, 315),
	connections: Schema.Option(Schema.Array(SolarSystemId)),
}) {}
