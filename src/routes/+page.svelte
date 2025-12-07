<script lang="ts">
	import { getStroke } from 'perfect-freehand';
	import { Delaunay } from 'd3-delaunay';
	import { forceManyBody, forceSimulation } from 'd3-force';
	import createGraph, { type Graph, type Link } from 'ngraph.graph';
	// @ts-expect-error -- no 1st or 3rd party type available
	import kruskal from 'ngraph.kruskal';
	import { onMount } from 'svelte';
	import { Portal, Tooltip } from '@skeletonlabs/skeleton-svelte';

	import { calc_num_starting_stars, generate_stellaris_galaxy } from '$lib/generateStellarisGalaxy';
	import { LocalStorageState } from '$lib/state.svelte';
	import {
		CENTER_MARK_SIZE,
		HEIGHT,
		MAX_CONNECTION_LENGTH,
		NUM_RANDOM_NEBULAS,
		RANDOM_NEBULA_MAX_RADIUS,
		RANDOM_NEBULA_MIN_RADIUS,
		RANDOM_NEBULA_MIN_DISTANCE,
		WIDTH,
		CUSTOM_NEBULA_MIN_RADIUS,
	} from '$lib/constants';
	import { are_points_equal } from '$lib/utils';
	import { resolve } from '$app/paths';

	let canvas = $state<HTMLCanvasElement>();
	let ctx = $derived(canvas?.getContext('2d'));

	const Step = {
		PAINT: 'PAINT',
		STARS: 'STARS',
		NEBULAS: 'NEBULAS',
		HYPERLANES: 'HYPERLANES',
		WORMHOLES: 'WORMHOLES',
		SPAWNS: 'SPAWNS',
		MOD: 'MOD',
	} as const;
	type Step = (typeof Step)[keyof typeof Step];
	let paint_step_open = $state(true);
	let stars_step_open = $state(false);
	let nebulas_step_open = $state(false);
	let hyperlanes_step_open = $state(false);
	let wormholes_step_open = $state(false);
	let spawns_step_open = $state(false);
	let mod_step_open = $state(false);
	let step = $derived.by(() => {
		if (paint_step_open) return Step.PAINT;
		if (stars_step_open) return Step.STARS;
		if (nebulas_step_open) return Step.NEBULAS;
		if (hyperlanes_step_open) return Step.HYPERLANES;
		if (wormholes_step_open) return Step.WORMHOLES;
		if (spawns_step_open) return Step.SPAWNS;
		if (mod_step_open) return Step.MOD;
		return null;
	});

	const MODE_DRAW = 'draw';
	const MODE_ERASE = 'erase';
	type BrushMode = typeof MODE_DRAW | typeof MODE_ERASE;

	let brush_size = new LocalStorageState('brushSize', 25);
	let brush_opacity = new LocalStorageState('brushOpacity', 0.5);
	let brush_blur = new LocalStorageState('brushBlur', 0);
	let brush_mode = new LocalStorageState<BrushMode>('brushMode', MODE_DRAW);

	let stroke_points = $state<{ x: number; y: number }[]>([]);
	let stroke = $derived(
		getStroke(stroke_points, {
			size: brush_size.current,
			thinning: 0.5,
			streamline: 0.5,
			smoothing: 1,
		}),
	);
	function make_path_data(stroke: number[][]) {
		if (stroke.length === 0) return '';
		return stroke
			.reduce(
				(acc, [x0, y0], i, arr) => {
					if (i === arr.length - 1) return acc;
					const [x1, y1] = arr[i + 1];
					return acc.concat(` ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`);
				},
				['M ', `${stroke[0][0]},${stroke[0][1]}`, ' Q'],
			)
			.concat('Z')
			.join('');
	}
	let stroke_path = $derived(make_path_data(stroke));

	type StrokeConfig = {
		size: number;
		blur: number;
		mode: BrushMode;
		opacity: number;
	};
	type RecordedStroke = {
		points: { x: number; y: number }[];
		config: StrokeConfig;
	};
	let strokes = $state<RecordedStroke[]>([]);
	let image_data_stack = $state<ImageData[]>([]);
	let undone_strokes = $state<RecordedStroke[]>([]);
	let image_data_undo_stack = $state<ImageData[]>([]);

	function record_stroke() {
		strokes.push({
			points: stroke_points.slice(),
			config: {
				size: brush_size.current,
				blur: brush_blur.current,
				mode: brush_mode.current,
				opacity: brush_opacity.current,
			},
		});
		push_image_data();
		undone_strokes.length = 0;
		image_data_undo_stack.length = 0;
		save_canvas();
	}

	const MAX_IMAGE_DATA_STACK_SIZE = 10;
	function push_image_data() {
		image_data_stack.push(ctx!.getImageData(0, 0, WIDTH, HEIGHT));
		while (image_data_stack.length > MAX_IMAGE_DATA_STACK_SIZE) {
			image_data_stack.shift();
		}
	}

	function save_canvas() {
		if (!canvas) return;
		const data_url = canvas.toDataURL();
		localStorage.setItem('paint-a-galaxy-canvas', data_url);
	}

	let initial_bitmap: ImageBitmap | null = $state(null);
	onMount(() => {
		const base_64_image_data = localStorage.getItem('paint-a-galaxy-canvas');
		if (base_64_image_data) {
			fetch(base_64_image_data)
				.then((resp) => resp.blob())
				.then((blob) => createImageBitmap(blob))
				.then((bitmap) => {
					initial_bitmap = bitmap;
					if (ctx) {
						ctx.drawImage(bitmap, 0, 0);
						// ctx.filter = 'grayscale(1)';
						// ctx.drawImage(img!, 0, 0, 900, 900);
					}
				});
		}
	});

	function draw_stroke(path: string, config: StrokeConfig) {
		if (!ctx) return;
		const p = new Path2D(stroke_path);
		ctx.globalAlpha = config.opacity;
		// big blur on erase mode feels like the eraser just isn't working; multiply by 0.5 to compensate
		ctx.filter = `blur(${config.size * config.blur * (config.mode === MODE_ERASE ? 0.5 : 1)}px)`;
		ctx.fillStyle = config.mode === MODE_DRAW ? '#FFFFFF' : '#000000';
		ctx.fill(p);
		if (config.mode === MODE_ERASE) {
			ctx.save();
			ctx.clip(p);
			convert_grayscale_to_opacity();
			ctx.restore();
		}
	}

	function convert_grayscale_to_opacity({ clear_low_opacity = false } = {}) {
		if (!ctx) return;
		const image_data = ctx.getImageData(0, 0, WIDTH, HEIGHT);
		for (let i = 0; i < image_data.data.length; i += 4) {
			// convert grayscale to transparency
			image_data.data[i + 3] = Math.round((image_data.data[i] / 255) * image_data.data[i + 3]);
			if (clear_low_opacity && image_data.data[i + 3] <= 2) {
				image_data.data[i + 3] = 0;
			}
			image_data.data[i] = 255;
			image_data.data[i + 1] = 255;
			image_data.data[i + 2] = 255;
		}
		ctx.putImageData(image_data, 0, 0);
	}

	function draw_recorded_stroke(stroke: RecordedStroke) {
		if (!ctx) return;
		const p = make_path_data(
			getStroke(stroke.points, {
				size: stroke.config.size,
				thinning: 0.5,
				streamline: 0.5,
				smoothing: 1,
			}),
		);
		draw_stroke(p, stroke.config);
	}

	function redraw() {
		if (!ctx) return;
		ctx.clearRect(0, 0, WIDTH, HEIGHT);
		if (initial_bitmap) {
			ctx.filter = 'blur(0)';
			ctx.globalAlpha = 1;
			ctx.drawImage(initial_bitmap, 0, 0);
		}
		for (const stroke of strokes) {
			draw_recorded_stroke(stroke);
		}
	}

	function undo() {
		if (step === Step.PAINT) {
			if (!strokes.length) return;
			undone_strokes.push(strokes.pop()!);
			if (image_data_stack.length) image_data_undo_stack.push(image_data_stack.pop()!);
			const last_image_data = image_data_stack.at(-1);
			if (last_image_data) {
				ctx?.clearRect(0, 0, WIDTH, HEIGHT);
				ctx?.putImageData(last_image_data, 0, 0);
				save_canvas();
			} else {
				redraw();
				save_canvas();
			}
		}
	}

	function redo() {
		if (step === Step.PAINT) {
			if (!undone_strokes.length) return;
			const stroke = undone_strokes.pop()!;
			const image_data = image_data_undo_stack.pop();
			if (image_data) {
				ctx?.putImageData(image_data, 0, 0);
				image_data_stack.push(image_data);
				save_canvas();
			} else {
				draw_recorded_stroke(stroke);
				push_image_data();
				save_canvas();
			}
			strokes.push(stroke);
		}
	}

	function clear() {
		if (!ctx) return;
		ctx.clearRect(0, 0, WIDTH, HEIGHT);
		strokes.length = 0;
		undone_strokes.length = 0;
		image_data_stack.length = 0;
		image_data_undo_stack.length = 0;
		save_canvas();
	}

	let number_of_stars = new LocalStorageState('numberOfStars', 600);
	let cluster_diffusion = new LocalStorageState('clusterDiffusion', 10);
	let stars = new LocalStorageState<[number, number][]>('stars', []);
	let nebulas = new LocalStorageState<[number, number, number][]>('nebulas', []);
	let creating_nebula = $state<[number, number, number] | null>(null);

	function toggle_star(point: [number, number]) {
		const index = stars.current.findIndex((star) => are_points_equal(star, point));
		if (index === -1) {
			stars.current.push(point);
		} else {
			stars.current.splice(index, 1);
			connections.current = connections.current.filter(
				(c) => !(are_points_equal(c[0], point) || are_points_equal(c[1], point)),
			);
			wormholes.current = wormholes.current.filter(
				(c) => !(are_points_equal(c[0], point) || are_points_equal(c[1], point)),
			);
		}
	}

	function generate_stars() {
		if (!ctx) return;
		stars.current.length = 0;
		connections.current.length = 0;
		wormholes.current.length = 0;
		potential_home_stars.current.length = 0;
		preferred_home_stars.current.length = 0;
		const image_data = ctx.getImageData(0, 0, WIDTH, HEIGHT);
		function get_alpha(x: number, y: number) {
			const index = y * WIDTH * 4 + x * 4 + 3;
			return image_data.data[index];
		}

		// count image and row alpha totals, to use for random weighted
		let total = 0;
		const rows: { total: number; values: number[] }[] = [];
		for (let y = 0; y < HEIGHT; y++) {
			const row = { total: 0, values: [] as number[] };
			rows.push(row);
			for (let x = 0; x < WIDTH; x++) {
				const value = get_alpha(x, y);
				total += value;
				row.total += value;
				row.values.push(value);
			}
		}

		// find a random pixel, using the alpha as weight
		for (let i = 0; i < number_of_stars.current; i++) {
			if (total === 0) {
				// we've used all pixels with nonzero alpha
				console.warn(`Generated ${i} stars; no more valid locations`);
				break;
			}
			const random = Math.floor(Math.random() * total);
			let current = 0;
			for (let y = 0; y < HEIGHT; y++) {
				const row = rows[y];
				if (current + row.total > random) {
					for (let x = 0; x < WIDTH; x++) {
						const value = row.values[x];
						if (current + value > random) {
							stars.current.push([x, y]);
							row.values[x] = 0;
							row.total -= value;
							total -= value;
							break;
						} else {
							current += value;
						}
					}
					break;
				} else {
					current += row.total;
				}
			}
		}
		diffuse_clusters();
		randomize_nebulas();
	}

	function diffuse_clusters() {
		const simulation = forceSimulation(stars.current.map(([x, y]) => ({ x, y })))
			.stop()
			.force('manyBody', forceManyBody().strength(-1));
		simulation.tick(Math.round(cluster_diffusion.current));
		stars.current = Array.from(
			new Set(simulation.nodes().map(({ x, y }) => [Math.round(x), Math.round(y)].toString())),
		).map((v) => v.split(',').map((s) => parseInt(s)) as [number, number]);
	}

	function randomize_nebulas() {
		nebulas.current = [];
		let potential_stars = stars.current;
		for (let i = 0; i < NUM_RANDOM_NEBULAS; i++) {
			if (potential_stars.length !== 0) {
				const random_index = Math.floor(Math.random() * potential_stars.length);
				const nebula: [number, number, number] = [
					...potential_stars[random_index],
					RANDOM_NEBULA_MIN_RADIUS +
						Math.floor(Math.random() * (RANDOM_NEBULA_MAX_RADIUS - RANDOM_NEBULA_MIN_RADIUS)),
				];
				nebulas.current.push(nebula);
				potential_stars = potential_stars.filter(
					(star) =>
						Math.hypot(star[0] - nebula[0], star[1] - nebula[1]) >= RANDOM_NEBULA_MIN_DISTANCE,
				);
			}
		}
	}

	let connectedness = new LocalStorageState('connectedness', 0.5);
	let max_connection_length = new LocalStorageState('maxConnectionLength', 100);
	let allow_disconnected = new LocalStorageState('allowDisconnected', false);
	let connections = new LocalStorageState<[[number, number], [number, number]][]>(
		'connections',
		[],
	);
	let potential_home_stars = new LocalStorageState<string[]>('potentialHomeStars', []);
	let preferred_home_stars = new LocalStorageState<string[]>('preferredHomeStars', []);
	let star_delaunay = $derived(
		step === Step.HYPERLANES || step === Step.WORMHOLES || step === Step.SPAWNS
			? new Delaunay(stars.current.flat())
			: null,
	);
	let toggling_hyperlane_from = $state<null | [number, number]>(null);

	function toggle_home_star(star: [number, number], { preferred }: { preferred: boolean }) {
		const index = potential_home_stars.current.findIndex((s) => s === star.toString());
		const preferred_index = preferred_home_stars.current.findIndex((s) => s === star.toString());
		if (index === -1 && preferred_index === -1) {
			potential_home_stars.current.push(star.toString());
			if (preferred) preferred_home_stars.current.push(star.toString());
		} else if (index >= 0 && preferred_index >= 0) {
			potential_home_stars.current.splice(index, 1);
			preferred_home_stars.current.splice(preferred_index, 1);
		} else if (index >= 0 && preferred_index === -1) {
			if (preferred) {
				preferred_home_stars.current.push(star.toString());
			} else {
				potential_home_stars.current.splice(index, 1);
			}
		}
	}

	function toggle_hyperlane(from: [number, number], to: [number, number]) {
		const index = connections.current.findIndex(
			(c) =>
				(are_points_equal(c[0], from) && are_points_equal(c[1], to)) ||
				(are_points_equal(c[1], from) && are_points_equal(c[0], to)),
		);
		if (index === -1) {
			connections.current.push([from, to]);
		} else {
			connections.current.splice(index, 1);
		}
	}

	function generate_connections() {
		connections.current.length = 0;
		potential_home_stars.current.length = 0;
		preferred_home_stars.current.length = 0;
		if (stars.current.length < 3) return;
		const g = createGraph<
			{ coords: [number, number]; d: number },
			{ distance: number; is_mst?: boolean }
		>();
		// generate triangulation
		const delaunay = new Delaunay(stars.current.flat());
		const render_context = {
			x: 0,
			y: 0,
			moveTo(x: number, y: number) {
				this.x = x;
				this.y = y;
			},
			lineTo(x: number, y: number) {
				const id_1 = `${this.x},${this.y}`;
				const id_2 = `${x},${y}`;
				const distance = Math.hypot(this.x - x, this.y - y);
				if (!g.hasNode(id_1)) g.addNode(id_1, { coords: [this.x, this.y], d: Infinity });
				if (!g.hasNode(id_2)) g.addNode(id_2, { coords: [x, y], d: Infinity });
				g.addLink(id_1, id_2, { distance });

				this.x = x;
				this.y = y;
			},
			closePath() {},
		};
		delaunay.render(render_context);

		// find minimum spanning tree
		const mst: { fromId: string; toId: string }[] = kruskal(
			g,
			(link: Link<{ distance: number; is_mst?: boolean }>) => link.data.distance,
		);
		for (const tree_link of mst) {
			const link = g.getLink(tree_link.fromId, tree_link.toId);
			if (link) link.data.is_mst = true;
		}

		// remove links
		// - greater than maxConnectionLength (MST allowed if allowDisconnected)
		// - non-MST removed randomly based on connectedness
		const links: Link<{ distance: number; is_mst?: boolean }>[] = [];
		g.forEachLink((link) => {
			links.push(link);
		});
		for (const link of links) {
			if (
				(link.data.distance > max_connection_length.current &&
					(!link.data.is_mst || allow_disconnected.current)) ||
				(Math.random() > connectedness.current && !link.data.is_mst)
			) {
				g.removeLink(link);
			}
		}

		randomize_home_systems(g);

		// add connections to state
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not using for state
		const added = new Set<string>();
		g.forEachLink((link) => {
			const key = [link.toId, link.fromId].sort().toString();
			if (added.has(key)) return;
			added.add(key);
			connections.current.push([
				g.getNode(link.fromId)!.data.coords,
				g.getNode(link.toId)!.data.coords,
			]);
		});
	}

	function randomize_home_systems(
		graph: Graph<{ coords: [number, number]; d: number }, { distance: number; isMst?: boolean }>,
	) {
		// find home stars
		const num_potential_home_stars = calc_num_starting_stars(stars.current);
		const new_potential_home_stars: [number, number][] = [];
		const start_index = Math.floor(
			Math.random() * (stars.current.length - num_potential_home_stars),
		);
		for (let i = start_index; i < start_index + num_potential_home_stars; i++) {
			if (stars.current[i]) new_potential_home_stars.push(stars.current[i]);
		}
		// move each to the star furthest from all other stars
		// a single iteration of this seems to be good enough
		new_potential_home_stars.forEach((star, index) => {
			// reset distance to inf
			graph.forEachNode((node) => {
				node.data.d = Infinity;
			});
			const edge: [number, number][] = [];
			// set distance of other potential homes to 0, and add them to the edge
			new_potential_home_stars
				.filter((other) => other !== star)
				.forEach((other) => {
					const node = graph.getNode(other.toString());
					node!.data.d = 0;
					edge.push(other);
				});
			let max_distance = 0;
			let max_distance_stars: [number, number][] = [];
			// modified Dijkstra's to find stars furthest from other home systems
			// (simplified since all edge weights are 1)
			while (edge.length) {
				const s = edge.pop()!;
				graph.forEachLinkedNode(
					s.toString(),
					(node) => {
						// avoid dead ends; they can be unfair/unfun home systems
						const is_dead_end = node.links == null || node.links.size <= 1;
						if (node.data.d === Infinity && !is_dead_end) {
							node.data.d = graph.getNode(s.toString())!.data.d + 1;
							if (node.data.d > max_distance) {
								max_distance = node.data.d;
								max_distance_stars = [node.data.coords];
							} else if (node.data.d === max_distance) {
								max_distance_stars.push(node.data.coords);
							}
							edge.unshift(node.data.coords);
						}
					},
					false,
				);
			}
			// move this starting system to the farthest star (random for tie)
			if (max_distance > 0 && max_distance_stars.length > 0) {
				new_potential_home_stars[index] =
					max_distance_stars[Math.floor(Math.random() * max_distance_stars.length)];
			}
		});
		potential_home_stars.current = new_potential_home_stars.map((s) => s.toString());
		preferred_home_stars.current = [];
	}

	function make_graph_from_connections() {
		const g = createGraph<
			{ coords: [number, number]; d: number },
			{ distance: number; isMst?: boolean }
		>();
		for (const star of stars.current) {
			g.addNode(`${star[0]},${star[1]}`, { coords: star, d: Infinity });
		}
		for (const [from, to] of connections.current) {
			g.addLink(`${from[0]},${from[1]}`, `${to[0]},${to[1]}`, {
				distance: Math.hypot(from[0] - to[0], from[1] - to[1]),
			});
		}
		return g;
	}

	let wormholes = new LocalStorageState<[[number, number], [number, number]][]>('wormholes', []);
	let toggling_wormhole_from = $state<null | [number, number]>(null);

	function toggle_wormhole(from: [number, number], to: [number, number]) {
		const index = wormholes.current.findIndex(
			(c) =>
				(are_points_equal(c[0], from) && are_points_equal(c[1], to)) ||
				(are_points_equal(c[1], from) && are_points_equal(c[0], to)),
		);
		if (index === -1) {
			// each system can only have 1 wormhole, so remove any wormholes that share an origin or destination
			wormholes.current = wormholes.current.filter(
				(c) =>
					!(
						are_points_equal(c[0], from) ||
						are_points_equal(c[0], to) ||
						are_points_equal(c[1], from) ||
						are_points_equal(c[1], to)
					),
			);
			wormholes.current.push([from, to]);
		} else {
			wormholes.current.splice(index, 1);
		}
	}

	let galaxy_name = new LocalStorageState('name', 'Painted Galaxy');
	let file_name = $derived(
		galaxy_name.current
			.toLowerCase()
			.replaceAll(' ', '_')
			.replaceAll(/\/\\<>:"\|\?\*/g, ''),
	);

	// debounce mod generation
	function download_mod() {
		if (!download_link) throw new Error('download_link does not exist');
		const download_url = URL.createObjectURL(
			new Blob(
				[
					generate_stellaris_galaxy(
						galaxy_name.current,
						stars.current,
						connections.current,
						wormholes.current,
						potential_home_stars.current,
						preferred_home_stars.current,
						nebulas.current,
					),
				],
				{ type: 'text/plain' },
			),
		);
		download_link.href = download_url;
		download_link.click();
	}
	let download_invalid = $derived(stars.current.length === 0 || connections.current.length === 0);
	let download_disabled = $derived(!galaxy_name || download_invalid);
	let download_link = $state<HTMLAnchorElement>();

	function throttle<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
		let last = 0;
		return function (...args: Args) {
			var now = Date.now();
			if (now - last >= ms) {
				fn(...args);
				last = now;
			}
		};
	}
</script>

<svelte:document
	onkeydown={(e) => {
		if (document.activeElement?.tagName === 'INPUT') return;
		if (e.key === 'z' && e.ctrlKey) {
			undo();
		} else if (
			(e.key === 'y' && e.ctrlKey) ||
			(e.key.toLowerCase() === 'z' && e.ctrlKey && e.shiftKey)
		) {
			redo();
		}
	}}
	onpointerup={() => {
		if (ctx && stroke_points.length) {
			draw_stroke(stroke_path, {
				size: brush_size.current,
				blur: brush_blur.current,
				mode: brush_mode.current,
				opacity: brush_opacity.current,
			});
			record_stroke();
			stroke_points = [];
		}
		if (creating_nebula) {
			nebulas.current.push(creating_nebula);
			creating_nebula = null;
		}
	}}
/>

<div class="flex flex-row">
	<div class="canvas" style:width={WIDTH} style:height={HEIGHT}>
		<canvas
			width={WIDTH}
			height={HEIGHT}
			bind:this={canvas}
			style:opacity={step === Step.PAINT ? '100%' : '50%'}
		></canvas>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg
			viewBox="0 0 {WIDTH} {HEIGHT}"
			width={WIDTH}
			height={HEIGHT}
			onclick={throttle((e) => {
				if (step === Step.STARS) {
					toggle_star([e.offsetX, e.offsetY]);
				} else if (step === Step.HYPERLANES) {
					const star_index = star_delaunay?.find(e.offsetX, e.offsetY);
					if (star_index == null) return;
					if (toggling_hyperlane_from) {
						if (stars.current[star_index] !== toggling_hyperlane_from) {
							toggle_hyperlane(toggling_hyperlane_from, stars.current[star_index]);
						}
						toggling_hyperlane_from = null;
					} else {
						toggling_hyperlane_from = stars.current[star_index];
					}
				} else if (step === Step.WORMHOLES) {
					console.log('wormhole step click');
					const star_index = star_delaunay?.find(e.offsetX, e.offsetY);
					if (star_index == null) return;
					if (toggling_wormhole_from) {
						if (stars.current[star_index] !== toggling_wormhole_from) {
							toggle_wormhole(toggling_wormhole_from, stars.current[star_index]);
						}
						toggling_wormhole_from = null;
					} else {
						toggling_wormhole_from = stars.current[star_index];
					}
				} else if (step === Step.SPAWNS) {
					const star_index = star_delaunay?.find(e.offsetX, e.offsetY);
					if (star_index == null) return;
					toggle_home_star(stars.current[star_index], { preferred: e.shiftKey });
				}
				// some users were experiencing duplicate clicks that instantly toggled on/off; add a small throttle
			}, 250)}
			onpointerdown={(e) => {
				if (e.button !== 0) return;
				if (step === Step.PAINT) {
					stroke_points = [{ x: e.offsetX, y: e.offsetY }];
				} else if (step === Step.NEBULAS) {
					if (!e.shiftKey) {
						creating_nebula = [e.offsetX, e.offsetY, CUSTOM_NEBULA_MIN_RADIUS];
					}
				}
			}}
			onpointermove={(e) => {
				if (step === Step.PAINT) {
					if (stroke_points.length) stroke_points.push({ x: e.offsetX, y: e.offsetY });
				} else if (step === Step.NEBULAS) {
					if (creating_nebula) {
						creating_nebula[2] = Math.max(
							CUSTOM_NEBULA_MIN_RADIUS,
							Math.round(
								Math.hypot(e.offsetX - creating_nebula[0], e.offsetY - creating_nebula[1]),
							),
						);
					}
				}
			}}
			style:cursor={step === Step.PAINT
				? 'pointer'
				: step === Step.STARS
					? 'crosshair'
					: step === Step.HYPERLANES || step === Step.WORMHOLES || step === Step.SPAWNS
						? 'pointer'
						: ''}
		>
			<path
				d={stroke_path}
				fill={brush_mode.current === MODE_DRAW ? '#FFFFFF' : 'var(--color-surface-50-950)'}
				opacity={brush_opacity.current}
			/>
			<path
				d="M {WIDTH / 2} {HEIGHT / 2 - CENTER_MARK_SIZE}
				   L {WIDTH / 2} {HEIGHT / 2 + CENTER_MARK_SIZE}
				   M {WIDTH / 2 - CENTER_MARK_SIZE} {HEIGHT / 2}
				   L {WIDTH / 2 + CENTER_MARK_SIZE} {HEIGHT / 2}"
				fill="none"
				stroke="#FFF"
				stroke-width="1"
				stroke-opacity="0.9"
			/>
			{#each connections.current as [from, to] (`${[from, to]}`)}
				<line
					x1={from[0]}
					y1={from[1]}
					x2={to[0]}
					y2={to[1]}
					stroke="var(--color-surface-50-950)"
					stroke-opacity="0.5"
					stroke-width="3"
				/>
				<line
					x1={from[0]}
					y1={from[1]}
					x2={to[0]}
					y2={to[1]}
					stroke="#FFFFFF"
					stroke-opacity="0.5"
					stroke-width="1"
				/>
			{/each}
			{#each wormholes.current as [from, to] (`${[from, to]}`)}
				<line
					x1={from[0]}
					y1={from[1]}
					x2={to[0]}
					y2={to[1]}
					stroke="#FF00FF"
					stroke-opacity="1"
					stroke-width="1"
					stroke-dasharray="3"
				/>
			{/each}
			{#each stars.current as [x, y] (`${[x, y]}`)}
				{#if step === Step.SPAWNS && preferred_home_stars.current.includes([x, y].toString())}
					<circle
						cx={x}
						cy={y}
						r="5"
						fill="none"
						stroke="var(--color-primary-500)"
						stroke-width="2"
					/>
				{/if}
				<circle
					cx={x}
					cy={y}
					r={(toggling_hyperlane_from && are_points_equal([x, y], toggling_hyperlane_from)) ||
					(toggling_wormhole_from && are_points_equal([x, y], toggling_wormhole_from))
						? '3.5'
						: step === Step.SPAWNS && potential_home_stars.current.includes([x, y].toString())
							? '3.5'
							: '2.5'}
					fill={(toggling_hyperlane_from && are_points_equal([x, y], toggling_hyperlane_from)) ||
					(toggling_wormhole_from && are_points_equal([x, y], toggling_wormhole_from))
						? 'var(--color-primary-500)'
						: step === Step.SPAWNS && potential_home_stars.current.includes([x, y].toString())
							? 'var(--color-primary-500)'
							: '#FFFFFF'}
					stroke="var(--color-surface-50-950)"
					stroke-width="1"
					onclick={(e) => {
						if (step === Step.STARS) {
							e.stopPropagation();
							toggle_star([x, y]);
						}
					}}
				/>
			{/each}
			{#if step === Step.NEBULAS}
				{#each nebulas.current as [cx, cy, r] (`${cx},${cy},${r}`)}
					<circle
						{cx}
						{cy}
						{r}
						fill="var(--color-primary-500)"
						fill-opacity="0.25"
						stroke="var(--color-primary-500)"
						stroke-width="1"
						stroke-opacity="0.5"
						onclick={(e) => {
							if (step === Step.NEBULAS && e.shiftKey) {
								e.stopPropagation();
								nebulas.current.splice(
									nebulas.current.findIndex(
										(nebula) => cx === nebula[0] && cy === nebula[1] && r === nebula[2],
									),
									1,
								);
							}
						}}
					/>
				{/each}
			{/if}
			{#if creating_nebula}
				<circle
					cx={creating_nebula[0]}
					cy={creating_nebula[1]}
					r={creating_nebula[2]}
					fill="var(--color-primary-500)"
					fill-opacity="0.5"
					stroke="var(--color-primary-500)"
					stroke-width="1"
					stroke-opacity="1"
				/>
			{/if}
		</svg>
	</div>
	<form class="w-96 p-4">
		<details name="step" bind:open={paint_step_open}>
			<summary>
				<small>1.</small>
				Paint
			</summary>
			<fieldset>
				<label class="label">
					<span class="label-text">Brush Size</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={1}
						max={100}
						step={1}
						bind:value={brush_size.current}
						data-value={brush_size.current}
					/>
				</label>
				<label class="label">
					<span class="label-text">Opacity</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={0}
						max={1}
						step={0.01}
						bind:value={brush_opacity.current}
						data-value={brush_opacity.current}
					/>
				</label>
				<label class="label">
					<span class="label-text">Blur</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={0}
						max={2}
						step={0.1}
						bind:value={brush_blur.current}
						data-value={brush_blur.current}
					/>
				</label>
				<label class="label">
					<span class="label-text">Mode</span>
					<select class="select" bind:value={brush_mode.current}>
						<option>{MODE_DRAW}</option>
						<option>{MODE_ERASE}</option>
					</select>
				</label>
				<div class="btn-group preset-outlined-surface-200-800">
					<button
						type="button"
						class="btn preset-filled-secondary-500"
						onclick={undo}
						disabled={strokes.length === 0}
					>
						Undo
					</button>
					<button
						type="button"
						class="btn preset-filled-secondary-500"
						onclick={redo}
						disabled={undone_strokes.length === 0}
					>
						Redo
					</button>
				</div>
				<div>
					<input
						type="button"
						class="btn preset-filled-error-500"
						onclick={clear}
						value="Clear Canvas"
					/>
				</div>
				<hr class="hr my-4" />
				<label class="label">
					<span class="label-text">...or upload an image</span>
					<input
						class="input"
						type="file"
						accept=".png,.jpg,.jpeg,.webp"
						oninput={async (e) => {
							const input = e.currentTarget;
							const file = input.files?.item(0);
							if (ctx && file) {
								ctx.filter = 'grayscale(1)';
								ctx.drawImage(await createImageBitmap(file), 0, 0, 900, 900);
								convert_grayscale_to_opacity({ clear_low_opacity: true });
								save_canvas();
								canvas?.toBlob(async (blob) => {
									if (blob) {
										initial_bitmap = await createImageBitmap(blob);
										strokes = [];
										undone_strokes = [];
										image_data_stack = [];
										image_data_undo_stack = [];
									}
								});
							}
						}}
					/>
				</label>
			</fieldset>
		</details>
		<hr />
		<details name="step" bind:open={stars_step_open}>
			<summary>
				<small>2.</small>
				Stars
			</summary>
			<fieldset>
				<label class="label">
					<span class="label-text">Number of Stars</span>
					<input class="input" type="number" step={1} bind:value={number_of_stars.current} />
				</label>
				<label class="label">
					<span class="label-text">Loosen Clusters</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={0}
						max={20}
						step={1}
						bind:value={cluster_diffusion.current}
						data-value={cluster_diffusion.current}
					/>
				</label>
				<input
					class="btn preset-filled-primary-500 block w-full"
					type="button"
					onclick={generate_stars}
					value="Generate Stars"
				/>
				<small>Click the map to add and remove stars</small>
			</fieldset>
		</details>
		<hr />
		<details
			name="step"
			bind:open={
				() => hyperlanes_step_open,
				(value) => {
					hyperlanes_step_open = value;
					if (!value) {
						toggling_hyperlane_from = null;
					}
				}
			}
		>
			<summary>
				<small>3.</small>
				Hyperlanes
			</summary>
			<fieldset>
				<label class="label">
					<span class="label-text">Density</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={0}
						max={1}
						step={0.01}
						bind:value={connectedness.current}
						data-value={connectedness.current}
					/>
				</label>
				<label class="label">
					<span class="label-text">Max Distance</span>
					<input
						class="input accent-primary-500!"
						type="range"
						min={0}
						max={MAX_CONNECTION_LENGTH}
						step={1}
						bind:value={max_connection_length.current}
						data-value={max_connection_length.current}
					/>
				</label>
				<fieldset>
					<label class="flex items-center space-x-2">
						<input class="checkbox" type="checkbox" bind:checked={allow_disconnected.current} />
						<span class="label-text">Allow Disconnected</span>
					</label>
				</fieldset>
				<input
					class="btn preset-filled-primary-500 block w-full"
					type="button"
					onclick={generate_connections}
					value="Generate Hyperlanes"
				/>
				<small>Click one star then another to customize hyperlanes</small>
			</fieldset>
		</details>
		<hr />
		<details
			name="step"
			bind:open={
				() => wormholes_step_open,
				(value) => {
					wormholes_step_open = value;
					if (!value) {
						toggling_wormhole_from = null;
					}
				}
			}
		>
			<summary>
				<small>4.</small>
				Wormholes
				<small>(Optional)</small>
			</summary>
			<fieldset>
				<small>
					Click one star then another to customize wormholes. Random wormholes will still spawn
					according to your galaxy settings.
				</small>
			</fieldset>
		</details>
		<hr />
		<details name="step" bind:open={nebulas_step_open}>
			<summary>
				<small>5.</small>
				Nebulas
				<small>(optional)</small>
			</summary>
			<fieldset>
				<input
					class="btn preset-filled-primary-500 block w-full"
					type="button"
					value="Randomize"
					onclick={randomize_nebulas}
				/>
				<small>Click and drag the map to create a nebula. Shift+click to delete a nebula.</small>
			</fieldset>
		</details>
		<hr />
		<details name="step" bind:open={spawns_step_open}>
			<summary>
				<small>6.</small>
				Spawns
				<small>(optional)</small>
			</summary>
			<fieldset>
				<input
					class="btn preset-filled-primary-500 block w-full"
					type="button"
					value="Randomize"
					onclick={() => randomize_home_systems(make_graph_from_connections())}
				/>
				<small>
					Click the map to customize spawn systems. Shift+click to make it a <Tooltip>
						<Tooltip.Trigger class="mark">preferred spawn</Tooltip.Trigger>
						<Portal>
							<Tooltip.Positioner>
								<Tooltip.Content class="w-48 bg-surface-100-900 py-2 px-4">
									These are used first, before normal spawns. In a single-player game with only one
									preferred spawn, the player will always spawn there.
								</Tooltip.Content>
							</Tooltip.Positioner>
						</Portal>
					</Tooltip>.
				</small>
			</fieldset>
		</details>
		<hr />
		<details name="step" bind:open={mod_step_open}>
			<summary>
				<small>7.</small>
				Mod
			</summary>
			<fieldset>
				<label class="label">
					<span class="label-text">Name</span>
					<input class="input" bind:value={galaxy_name.current} />
				</label>
				<a href={resolve('/')} hidden download="{file_name}.txt" bind:this={download_link}>
					Download Map
				</a>
				<input
					class="btn preset-filled-primary-500 block w-full"
					type="button"
					disabled={download_disabled}
					onclick={download_mod}
					value="Download Map"
				/>
				{#if download_invalid}
					<small class="text-error-700-300">You must generate stars and hyperlanes first</small>
				{/if}
				<a
					class="anchor"
					href="https://steamcommunity.com/sharedfiles/filedetails/?id=3532904115"
					target="_blank"
				>
					Subscribe and read instructions on the Workshop
				</a>
			</fieldset>
		</details>
	</form>
</div>

<style>
	.canvas {
		border: 1px solid white;
		position: relative;
		align-self: start;

		svg {
			position: absolute;
			top: 0;
			left: 0;
		}
	}
</style>
