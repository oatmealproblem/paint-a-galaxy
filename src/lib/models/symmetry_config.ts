import { Schema } from 'effect';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';
import { convert_degrees_to_radians } from '../math';
import { Coordinate } from './coordinate';

const CANVAS_MID_X = CANVAS_WIDTH / 2;
const CANVAS_MID_Y = CANVAS_HEIGHT / 2;
const CANVAS_MAX = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);

export class SymmetryConfig extends Schema.Class<SymmetryConfig>(
	'SymmetryConfig',
)({
	enabled: Schema.Boolean.pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => false),
	),
	mode: Schema.Literal('bilateral', 'radial').pipe(
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 'radial'),
	),
	number: Schema.Number.pipe(
		Schema.greaterThanOrEqualTo(2),
		Schema.propertySignature,
		Schema.withConstructorDefault(() => 4),
	),
	angle: Schema.Number.pipe(
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

	// the symmetry center is the canvas center offset by (x_offset, y_offset).
	// For bilateral mode the mirror line passes through this point at `angle`;
	// for radial mode rotation happens about this point.
	get #center(): Coordinate {
		return Coordinate.make({
			x: CANVAS_MID_X + this.x_offset,
			y: CANVAS_MID_Y + this.y_offset,
		});
	}

	/**
	 * Returns the symmetry transform functions (excluding the identity), one per
	 * symmetric copy. For bilateral mode there is a single reflection; for radial
	 * mode there are `number - 1` rotations.
	 */
	get transforms(): ReadonlyArray<(coordinate: Coordinate) => Coordinate> {
		if (!this.enabled) return [];

		if (this.mode === 'radial') {
			const transforms: ((coordinate: Coordinate) => Coordinate)[] = [];
			for (let k = 1; k < this.number; k++) {
				const theta = (k * 2 * Math.PI) / this.number;
				const cos = Math.cos(theta);
				const sin = Math.sin(theta);
				transforms.push((c) =>
					Coordinate.make({
						x:
							this.#center.x +
							(c.x - this.#center.x) * cos -
							(c.y - this.#center.y) * sin,
						y:
							this.#center.y +
							(c.x - this.#center.x) * sin +
							(c.y - this.#center.y) * cos,
					}),
				);
			}
			return transforms;
		} else {
			// bilateral
			const theta = convert_degrees_to_radians(this.angle);
			const cos = Math.cos(theta);
			const sin = Math.sin(theta);
			return [
				(c) => {
					const vx = c.x - this.#center.x;
					const vy = c.y - this.#center.y;
					const d = vx * cos + vy * sin; // v · direction
					const nn = -vx * sin + vy * cos; // v · normal
					return Coordinate.make({
						x: this.#center.x + d * cos + nn * sin,
						y: this.#center.y + d * sin - nn * cos,
					});
				},
			];
		}
	}

	/**
	 * Returns the guide lines to render for this symmetry config.
	 * - bilateral: the single mirror axis.
	 * - radial: one spoke per sector emanating from the rotation center.
	 */
	calculate_guide_lines(): {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}[] {
		if (!this.enabled) return [];
		const L = CANVAS_MAX * 2;
		if (this.mode === 'radial') {
			const lines: ReturnType<SymmetryConfig['calculate_guide_lines']> = [];
			for (let k = 0; k < this.number; k++) {
				const angle = (k * 2 * Math.PI) / this.number;
				const dx = Math.cos(angle);
				const dy = Math.sin(angle);
				lines.push({
					x1: this.#center.x,
					y1: this.#center.y,
					x2: this.#center.x + dx * L,
					y2: this.#center.y + dy * L,
				});
			}
			return lines;
		}
		// bilateral
		const theta = convert_degrees_to_radians(this.angle);
		const dx = Math.cos(theta);
		const dy = Math.sin(theta);
		return [
			{
				x1: this.#center.x - dx * L,
				y1: this.#center.y - dy * L,
				x2: this.#center.x + dx * L,
				y2: this.#center.y + dy * L,
			},
		];
	}

	calculate_symmetric_coordinates(points: Coordinate[]): Coordinate[][] {
		return this.transforms.map((transform) => points.map(transform));
	}
}
