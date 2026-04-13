import { Schema } from 'effect';

export class GridConfig extends Schema.Class<GridConfig>('GridConfig')({
	snap: Schema.Boolean.pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => false),
	),
	type: Schema.Literal(
		'square',
		'triangle',
		'hex',
		'radial-4',
		'radial-6',
	).pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 'square'),
	),
	size: Schema.Number.pipe(
		Schema.greaterThan(0),
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 20),
	),
	rotate: Schema.Number.pipe(
		Schema.between(0, 360),
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 0),
	),
	x_offset: Schema.Number.pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 0),
	),
	y_offset: Schema.Number.pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 0),
	),
}) {
	static default() {
		return this.make({});
	}
}
