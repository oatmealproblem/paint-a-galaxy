import { Coordinate } from './models/coordinate';

export function convert_degrees_to_radians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function get_direction_label(dx: number, dy: number): string {
	const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
	if (angle < 22.5 || angle >= 337.5) return 'E';
	if (angle < 67.5) return 'SE';
	if (angle < 112.5) return 'S';
	if (angle < 157.5) return 'SW';
	if (angle < 202.5) return 'W';
	if (angle < 247.5) return 'NW';
	if (angle < 292.5) return 'N';
	return 'NE';
}

export function get_degrees_difference(a_degrees: number, b_degrees: number) {
	const raw = Math.abs((a_degrees % 360) - (b_degrees % 360));
	if (raw > 180) {
		return 360 - raw;
	} else {
		return raw;
	}
}

export function expand_rectangle_corners(
	points: readonly Coordinate[],
): [Coordinate, Coordinate, Coordinate, Coordinate] {
	if (points.length === 4)
		return [...points] as ReturnType<typeof expand_rectangle_corners>;
	if (points.length !== 2) throw Error('Unexpected rectangle payload');
	const a = points[0]!;
	const b = points[1]!;
	const x_min = Math.min(a.x, b.x);
	const x_max = Math.max(a.x, b.x);
	const y_min = Math.min(a.y, b.y);
	const y_max = Math.max(a.y, b.y);
	return [
		Coordinate.make({ x: x_min, y: y_min }),
		Coordinate.make({ x: x_max, y: y_min }),
		Coordinate.make({ x: x_max, y: y_max }),
		Coordinate.make({ x: x_min, y: y_max }),
	];
}
