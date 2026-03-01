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

	distance_to(coordinate: Coordinate): number {
		return Math.hypot(this.x - coordinate.x, this.y - coordinate.y);
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
