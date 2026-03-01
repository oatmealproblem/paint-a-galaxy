import { Schema } from 'effect';
import { Coordinate } from './coordinate';

export class Nebula extends Schema.Class<Nebula>('Nebula')({
	coordinate: Coordinate,
	radius: Schema.Int.pipe(Schema.greaterThan(0)),
}) {
	get key(): string {
		return `${this.coordinate.x},${this.coordinate.y},${this.radius}`;
	}
}
