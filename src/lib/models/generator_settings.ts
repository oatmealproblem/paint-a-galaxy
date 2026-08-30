import {
	NUM_RANDOM_NEBULAS,
	RANDOM_NEBULA_MAX_RADIUS,
	RANDOM_NEBULA_MIN_RADIUS,
} from '$lib/constants';
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
	spawns_per_100_solar_systems: Schema.Int.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 3,
			decoding: () => 3,
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
			constructor: () => 0.75,
			decoding: () => 0.75,
		}),
	),
	inter_cluster_connectivity: Schema.Number.pipe(
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
	max_cluster_size: Schema.Int.pipe(
		Schema.greaterThanOrEqualTo(1),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 10,
			decoding: () => 10,
		}),
	),
	number_of_nebulas: Schema.Int.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => NUM_RANDOM_NEBULAS,
			decoding: () => NUM_RANDOM_NEBULAS,
		}),
	),
	nebula_min_size: Schema.Number.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => RANDOM_NEBULA_MIN_RADIUS,
			decoding: () => RANDOM_NEBULA_MIN_RADIUS,
		}),
	),
	nebula_max_size: Schema.Number.pipe(
		Schema.greaterThanOrEqualTo(0),
		Schema.optional,
		Schema.withDefaults({
			constructor: () => RANDOM_NEBULA_MAX_RADIUS,
			decoding: () => RANDOM_NEBULA_MAX_RADIUS,
		}),
	),
}) {
	static default() {
		return this.make({});
	}
}
