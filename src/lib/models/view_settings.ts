import { Schema } from 'effect';

export class ViewSettings extends Schema.Class<ViewSettings>('ViewSettings')({
	canvas_opacity_paint_step: Schema.Number.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 1,
			decoding: () => 1,
		}),
	),
	canvas_opacity_generate_step: Schema.Number.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 0.5,
			decoding: () => 0.5,
		}),
	),
	canvas_opacity_tweak_step: Schema.Number.pipe(
		Schema.optional,
		Schema.withDefaults({
			constructor: () => 0,
			decoding: () => 0,
		}),
	),
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
