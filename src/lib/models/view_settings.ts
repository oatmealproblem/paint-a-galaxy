import { Schema } from 'effect';

export class ViewSettings extends Schema.Class<ViewSettings>('ViewSettings')({
	show_center_mark: Schema.Boolean.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => true,
			decoding: () => true,
		}),
	),
	show_map_limit: Schema.Boolean.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => true,
			decoding: () => true,
		}),
	),
	show_l_cluster: Schema.Boolean.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => true,
			decoding: () => true,
		}),
	),
	show_giga_core: Schema.Boolean.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => false,
			decoding: () => false,
		}),
	),
	show_giga_aeternum: Schema.Boolean.pipe(
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
