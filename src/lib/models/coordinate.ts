import { Schema } from 'effect';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../constants';

export class Coordinate extends Schema.Class<Coordinate>('Coordinate')({
	x: Schema.Number,
	y: Schema.Number,
}) {
	get key(): string {
		return `${this.x},${this.y}`;
	}

	to_stellaris_coordinate(): Coordinate {
		return Coordinate.make({
			x: -(this.x - CANVAS_WIDTH / 2),
			y: this.y - CANVAS_HEIGHT / 2,
		});
	}

	to_rounded(): Coordinate {
		return Coordinate.make({
			x: Math.round(this.x),
			y: Math.round(this.y),
		});
	}

	static to_rounded(coordinate: Coordinate) {
		return coordinate.to_rounded();
	}

	distance_to(coordinate: Coordinate): number {
		return Math.hypot(this.x - coordinate.x, this.y - coordinate.y);
	}

	get_coordinate_in_direction(radians: number, distance: number) {
		return Coordinate.make({
			x: this.x + Math.cos(radians) * distance,
			y: this.y + Math.sin(radians) * distance,
		});
	}

	is_in_canvas_bounds(): boolean {
		return (
			this.x >= 0 &&
			this.y >= 0 &&
			this.x < CANVAS_WIDTH &&
			this.y < CANVAS_HEIGHT
		);
	}

	static from_stellaris_coordinate(
		stellaris_coordinate: Coordinate,
	): Coordinate {
		return Coordinate.make({
			x: -stellaris_coordinate.x + CANVAS_WIDTH / 2,
			y: stellaris_coordinate.y + CANVAS_HEIGHT / 2,
		});
	}
}
