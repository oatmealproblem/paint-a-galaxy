import { Schema } from 'effect';

export class GeneratorSettings extends Schema.Class<GeneratorSettings>(
	'GeneratorSettings',
)({
	number_of_systems: Schema.Int.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 600,
			decoding: () => 600,
		}),
	),
	min_distance_between_systems: Schema.Number.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 10,
			decoding: () => 10,
		}),
	),
	hyperlane_connectivity: Schema.Number.pipe(
		Schema.clamp(0, 1),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 0.5,
			decoding: () => 0.5,
		}),
	),
	hyperlane_max_distance: Schema.Number.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 50,
			decoding: () => 50,
		}),
	),
	allow_disconnected: Schema.Boolean.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => false,
			decoding: () => false,
		}),
	),
}) {
	static default() {
		return this.make({});
	}
}
