import { Schema } from 'effect';
import { Coordinate } from './coordinate';

export const SolarSystemId = Schema.Int.pipe(Schema.brand('SolaySystemId'));
export type SolarSystemId = typeof SolarSystemId.Type;

export class SolarSystem extends Schema.Class<SolarSystem>('SolarSystem')({
	id: SolarSystemId,
	coordinate: Coordinate,
	spawn_type: Schema.Literal('disabled', 'enabled', 'preferred').pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 'disabled'),
	),
}) {}
