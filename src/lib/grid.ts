import { Array, Function, Iterable, Match, Number, pipe } from 'effect';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';
import { Coordinate } from './models/coordinate';

const CANVAS_MAX = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
const CANVAS_MID_X = CANVAS_WIDTH / 2;
const CANVAS_MID_Y = CANVAS_HEIGHT / 2;
const SQRT3 = Math.sqrt(3);

export function generate_grid_points(
	type: 'square' | 'triangle' | 'hex' | 'radial-4' | 'radial-6',
	size: number,
	degrees: number,
	x_offset: number,
	y_offset: number,
): Coordinate[] {
	return Match.value(type).pipe(
		Match.when('square', () =>
			pipe(
				Iterable.range(
					-Math.round((CANVAS_WIDTH * 1.5) / size),
					Math.round((CANVAS_WIDTH * 1.5) / size),
				),
				Iterable.map(Number.multiply(size)),
				Iterable.map(Number.sum(CANVAS_MID_X)),
				Iterable.flatMap((x) =>
					pipe(
						Iterable.range(
							-Math.round((CANVAS_HEIGHT * 1.5) / size),
							Math.round((CANVAS_HEIGHT * 1.5) / size),
						),
						Iterable.map(Number.multiply(size)),
						Iterable.map(Number.sum(CANVAS_MID_Y)),
						Iterable.map((y) => new Coordinate({ x, y })),
					),
				),
				Iterable.map(rotate(degrees)),
				Iterable.map(offset(x_offset, y_offset)),
				Iterable.filter(in_bounds),
				Array.fromIterable,
			),
		),
		Match.when('triangle', () =>
			pipe(
				Iterable.range(
					-Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)),
					Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)),
				),
				Iterable.map(Number.multiply(calc_triangle_height(size))),
				Iterable.map(Number.sum(CANVAS_MID_Y)),
				Iterable.flatMap((y, i) => {
					const row_offset =
						(
							i % 2 ===
							Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)) % 2
						) ?
							0
						:	size / 2;
					return pipe(
						Iterable.range(
							-Math.round((CANVAS_WIDTH * 1.5) / size),
							Math.round((CANVAS_WIDTH * 1.5) / size),
						),
						Iterable.map(Number.multiply(size)),
						Iterable.map(Number.sum(CANVAS_MID_X + row_offset)),
						Iterable.map((x) => new Coordinate({ x, y })),
					);
				}),
				Iterable.map(rotate(degrees)),
				Iterable.map(offset(x_offset, y_offset)),
				Iterable.filter(in_bounds),
				Array.fromIterable,
			),
		),
		Match.when('hex', () =>
			pipe(
				Iterable.range(
					-Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)),
					Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)),
				),
				Iterable.map(Number.multiply(calc_triangle_height(size))),
				Iterable.map(Number.sum(CANVAS_MID_Y)),
				Iterable.flatMap((y, i) => {
					const row_offset =
						(
							i % 2 ===
							Math.round((CANVAS_HEIGHT * 1.5) / calc_triangle_height(size)) % 2
						) ?
							0
						:	size / 2;
					return pipe(
						Iterable.range(
							-Math.round((CANVAS_WIDTH * 1.5) / size),
							Math.round((CANVAS_WIDTH * 1.5) / size),
						),
						Iterable.map(Number.multiply(size)),
						Iterable.map(Number.sum(CANVAS_MID_X + row_offset)),
						Iterable.filter(
							(_, i) =>
								(i + (row_offset === 0 ? 2 : 1)) % 3 !==
								Math.round((CANVAS_WIDTH * 1.5) / size) % 3,
						),
						Iterable.map((x) => new Coordinate({ x, y })),
					);
				}),
				Iterable.map(rotate(degrees)),
				Iterable.map(offset(x_offset, y_offset)),
				Iterable.filter(in_bounds),
				Array.fromIterable,
			),
		),
		Match.when('radial-4', () =>
			pipe(
				generate_radial_grid_points(size, 4),
				Iterable.map(rotate(degrees)),
				Iterable.map(offset(x_offset, y_offset)),
				Iterable.filter(in_bounds),
				Array.fromIterable,
			),
		),
		Match.when('radial-6', () =>
			pipe(
				generate_radial_grid_points(size, 6),
				Iterable.map(rotate(degrees)),
				Iterable.map(offset(x_offset, y_offset)),
				Iterable.filter(in_bounds),
				Array.fromIterable,
			),
		),
		Match.exhaustive,
	);
}

export function generate_grid_path(
	type: 'square' | 'triangle' | 'hex' | 'radial-4' | 'radial-6',
	size: number,
): string {
	return Match.value(type).pipe(
		Match.when('square', () =>
			pipe(
				Iterable.empty<string>(),
				Iterable.appendAll(
					pipe(
						Iterable.range(0, (CANVAS_WIDTH * 1.5) / size),
						Iterable.map(Number.multiply(size)),
						Iterable.flatMap((x) =>
							Array.dedupeAdjacent([
								`M ${CANVAS_MID_X + x} ${-CANVAS_HEIGHT} v ${CANVAS_HEIGHT * 3}`,
								`M ${CANVAS_MID_X - x} ${-CANVAS_HEIGHT} v ${CANVAS_HEIGHT * 3}`,
							]),
						),
					),
				),
				Iterable.appendAll(
					pipe(
						Iterable.range(0, (CANVAS_HEIGHT * 1.5) / size),
						Iterable.map(Number.multiply(size)),
						Iterable.flatMap((y) =>
							Array.dedupeAdjacent([
								`M ${-CANVAS_WIDTH} ${CANVAS_MID_Y + y} h ${CANVAS_WIDTH * 3}`,
								`M ${-CANVAS_WIDTH} ${CANVAS_MID_Y - y} h ${CANVAS_WIDTH * 3}`,
							]),
						),
					),
				),
				Array.fromIterable,
				Array.join(' '),
			),
		),
		Match.when('triangle', () =>
			pipe(
				Iterable.empty<string>(),
				Iterable.appendAll(
					pipe(
						Iterable.range(0, (CANVAS_WIDTH * 2) / size),
						Iterable.map(Number.multiply(size)),
						Iterable.flatMap((x) => {
							const angle_1 = (Math.PI * 2 * 1) / 6;
							const dx = Math.cos(angle_1) * CANVAS_HEIGHT;
							const dy = Math.sin(angle_1) * CANVAS_HEIGHT;
							return Array.dedupeAdjacent([
								`M ${CANVAS_MID_X + x + dx} ${CANVAS_MID_Y + dy} L ${CANVAS_MID_X + x - dx} ${CANVAS_MID_Y - dy}`,
								`M ${CANVAS_MID_X - x + dx} ${CANVAS_MID_Y + dy} L ${CANVAS_MID_X - x - dx} ${CANVAS_MID_Y - dy}`,
								`M ${CANVAS_MID_X + x - dx} ${CANVAS_MID_Y + dy} L ${CANVAS_MID_X + x + dx} ${CANVAS_MID_Y - dy}`,
								`M ${CANVAS_MID_X - x - dx} ${CANVAS_MID_Y + dy} L ${CANVAS_MID_X - x + dx} ${CANVAS_MID_Y - dy}`,
							]);
						}),
					),
				),
				Iterable.appendAll(
					pipe(
						Iterable.range(
							-Math.round(CANVAS_HEIGHT / ((size / 2) * SQRT3)),
							Math.round(CANVAS_HEIGHT / ((size / 2) * SQRT3)),
						),
						Iterable.map(Number.multiply((size / 2) * SQRT3)),
						Iterable.map(
							(y) =>
								`M ${-CANVAS_WIDTH} ${CANVAS_MID_Y + y} h ${CANVAS_WIDTH * 3}`,
						),
					),
				),
				Array.fromIterable,
				Array.join(' '),
			),
		),
		Match.when('hex', () =>
			pipe(
				Iterable.empty<string>(),
				Iterable.appendAll(
					pipe(
						Iterable.range(0, CANVAS_WIDTH / size),
						Iterable.map(Number.multiply(size * 1.5)),
						Iterable.flatMap((x, i) => {
							const y_offset = i % 2 === 0 ? 0 : (size / 2) * SQRT3;
							Iterable.range(0, CANVAS_HEIGHT / size);
							return x === 0 ?
									generate_hex_grid_col_paths(size, x, y_offset)
								:	Iterable.appendAll(
										generate_hex_grid_col_paths(size, x, y_offset),
										generate_hex_grid_col_paths(size, -x, y_offset),
									);
						}),
					),
				),
				Array.fromIterable,
				Array.join(' '),
			),
		),
		Match.when('radial-4', () => generate_radial_grid_path(size, 4)),
		Match.when('radial-6', () => generate_radial_grid_path(size, 6)),
		Match.exhaustive,
	);
}

function generate_hex_grid_col_paths(
	size: number,
	x: number,
	y_offset: number,
) {
	return pipe(
		Iterable.range(
			-Math.round(CANVAS_HEIGHT / (size * SQRT3)),
			Math.round(CANVAS_HEIGHT / (size * SQRT3)),
		),
		Iterable.map(Number.multiply(size * SQRT3)),
		Iterable.map(
			(y) => `
				M ${CANVAS_MID_X - x} ${CANVAS_MID_Y + y - y_offset}
				L ${CANVAS_MID_X - x - size} ${CANVAS_MID_Y + y - y_offset}
				L ${CANVAS_MID_X - x - size * 1.5} ${CANVAS_MID_Y + y - y_offset - (size / 2) * SQRT3}
				L ${CANVAS_MID_X - x - size} ${CANVAS_MID_Y + y - y_offset - size * SQRT3}`,
		),
	);
}

function generate_radial_grid_points(size: number, starting_sectors: number) {
	return pipe(
		Iterable.range(0, (CANVAS_MAX * 1.5) / size),
		Iterable.flatMap((i) => {
			if (i === 0)
				return Iterable.of(
					new Coordinate({ x: CANVAS_MID_X, y: CANVAS_MID_Y }),
				);
			const r = size * i;
			const num_sectors = calc_num_sectors(i, starting_sectors);
			return pipe(
				Iterable.range(0, num_sectors - 1),
				Iterable.map((sector) => {
					const angle = (2 * Math.PI * sector) / num_sectors;
					const x = CANVAS_MID_X + Math.cos(angle) * r;
					const y = CANVAS_MID_Y + Math.sin(angle) * r;
					return new Coordinate({ x, y });
				}),
			);
		}),
	);
}

function generate_radial_grid_path(size: number, starting_sectors: number) {
	return pipe(
		Iterable.empty<string>(),
		Iterable.appendAll(
			pipe(
				Iterable.range(1, (CANVAS_MAX * 1.5) / size),
				Iterable.map(Number.multiply(size)),
				Iterable.map(
					(r) =>
						`M ${CANVAS_MID_X - r} ${CANVAS_MID_Y} a ${r} ${r} 0 0 0 ${2 * r} 0 a ${r} ${r} 0 0 0 ${-2 * r} 0`,
				),
			),
		),
		Iterable.appendAll(
			pipe(
				Iterable.range(0, (CANVAS_MAX * 1.5) / size),
				Iterable.flatMap((i) => {
					const r = i * size;
					const num_sectors = calc_num_sectors(i, starting_sectors);
					const prev_num_sectors = calc_num_sectors(i - 1, starting_sectors);
					if (i !== 0 && num_sectors === prev_num_sectors) return [];
					return pipe(
						Iterable.range(1, num_sectors),
						Iterable.filter(
							(n) => num_sectors === starting_sectors || (n + 1) % 2 === 0,
						),
						Iterable.map((n) => {
							const angle = (2 * Math.PI * n) / num_sectors;
							const unit_x = Math.cos(angle);
							const unit_y = Math.sin(angle);
							return `M ${CANVAS_MID_X + unit_x * r} ${CANVAS_MID_Y + unit_y * r} L ${CANVAS_MID_X + unit_x * CANVAS_MAX * 1.5} ${CANVAS_MID_Y + unit_y * CANVAS_MAX * 1.5}`;
						}),
					);
				}),
			),
		),
		Array.fromIterable,
		Array.join(' '),
	);
}

function calc_num_sectors(r: number, starting_sectors: number) {
	return Math.max(
		starting_sectors *
			2 ** Math.round(Math.log2((r * 2 * Math.PI) / starting_sectors)),
		starting_sectors,
	);
}

function calc_triangle_height(size: number) {
	return (size / 2) * SQRT3;
}

function rotate(degrees: number): (coordinate: Coordinate) => Coordinate {
	if (degrees === 0) return Function.identity;
	return function rotate(coordinate: Coordinate): Coordinate {
		const dx = coordinate.x - CANVAS_MID_X;
		const dy = coordinate.y - CANVAS_MID_Y;
		const distance = Math.hypot(dx, dy);
		const angle = Math.atan2(dy, dx);
		const new_angle = angle + (degrees / 180) * Math.PI;
		const x = CANVAS_MID_X + Math.cos(new_angle) * distance;
		const y = CANVAS_MID_Y + Math.sin(new_angle) * distance;
		return new Coordinate({ x, y });
	};
}

function offset(
	x_offset: number,
	y_offset: number,
): (coordinate: Coordinate) => Coordinate {
	if (x_offset === 0 && y_offset === 0) return Function.identity;
	return function rotate(coordinate: Coordinate): Coordinate {
		const x = coordinate.x + x_offset;
		const y = coordinate.y + y_offset;
		return new Coordinate({ x, y });
	};
}

function in_bounds(coordinate: Coordinate): boolean {
	return (
		coordinate.x >= 0 &&
		coordinate.x <= CANVAS_WIDTH &&
		coordinate.y >= 0 &&
		coordinate.y <= CANVAS_HEIGHT
	);
}
