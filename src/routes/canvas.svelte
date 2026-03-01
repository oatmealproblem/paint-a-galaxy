<script lang="ts">
	import {
		CANVAS_BACKGROUND,
		CANVAS_HEIGHT,
		CANVAS_WIDTH,
		CENTER_MARK_SIZE,
		CUSTOM_COMMAND,
		ID,
	} from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { Coordinate } from '$lib/models/coordinate';
	import type { SolarSystem } from '$lib/models/solar_system';
	import type { Tool } from '$lib/models/tool';
	import { Delaunay } from 'd3-delaunay';
	import { select } from 'd3-selection';
	import { zoom, zoomIdentity, type D3ZoomEvent } from 'd3-zoom';
	import { Boolean, Equal, Match, Option, pipe } from 'effect';
	import custom_crosshair from './crosshair.svg?inline';

	const editor = get_editor();
	const project = $derived(editor().project);
	const solar_systems = $derived(project.solar_systems);
	const hyperlanes = $derived(project.hyperlanes);
	const wormholes = $derived(project.wormholes);
	const nebulas = $derived(project.nebulas);
	let is_shift_pressed = $state(false);
	const current_tool = $derived.by(() => {
		if (is_shift_pressed) {
			if (editor().secondary_tool.step === editor().step) {
				return Option.some(editor().secondary_tool);
			} else {
				return Option.none();
			}
		} else {
			if (editor().primary_tool.step === editor().step) {
				return Option.some(editor().primary_tool);
			} else {
				return Option.none();
			}
		}
	});

	let mouse_coordinates = $state.raw<
		Option.Option<{
			container: Coordinate;
			viewbox: Coordinate;
			canvas: Coordinate;
			stellaris: Coordinate;
		}>
	>(Option.none());

	let active_tool = $state<Option.Option<Tool>>(Option.none());
	let snapped_solar_system = $state.raw<Option.Option<SolarSystem>>(
		Option.none(),
	);
	let tool_points = $state<Coordinate[]>([]);
	let stroke_path = $derived(
		tool_points.length > 1 ?
			editor().calculate_path(
				pipe(
					active_tool,
					Option.map((value) => value.id),
					Option.getOrElse(() => editor().primary_tool_id),
				),
				tool_points,
			)
		:	'',
	);

	const delaunay = $derived(
		solar_systems.length > 0 && editor().step === 'tweak' ?
			new Delaunay(
				solar_systems.flatMap((system) => [
					system.coordinate.x,
					system.coordinate.y,
				]),
			)
		:	null,
	);

	let canvas = $state<HTMLCanvasElement>();
	let ctx = $derived(canvas?.getContext('2d'));
	$effect(() => {
		createImageBitmap(project.canvas).then((bitmap) => {
			ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			ctx?.drawImage(bitmap, 0, 0);
		});
	});

	let container = $state<HTMLElement>();
	let container_height = $state(0);

	let svg = $state<SVGSVGElement>();
	let transform = $state({ k: 1, x: 0, y: 0 });
	const zoom_behavior = zoom<SVGSVGElement, unknown>()
		.extent([
			[0, 0],
			[CANVAS_WIDTH, CANVAS_HEIGHT],
		])
		.scaleExtent([0.5, 8])
		.translateExtent([
			[-CANVAS_WIDTH, -CANVAS_HEIGHT],
			[CANVAS_WIDTH * 2, CANVAS_HEIGHT * 2],
		])
		.filter((event: PointerEvent) => {
			if (
				event.type === 'mousedown' &&
				(event.button === 0 || event.button === 2)
			)
				return false;
			return true;
		})
		.on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
			transform = e.transform;
		});
	$effect(() => {
		if (svg) select(svg).call(zoom_behavior);
	});

	function get_mouse_coordinates(event: MouseEvent) {
		if (container == null) throw new Error('null canvas container');
		const bbox = container.getBoundingClientRect();
		const container_coordinate = Coordinate.make({
			x: event.clientX - bbox.x,
			y: event.clientY - bbox.y,
		});
		// this is the transform done automatically by the SVG, regardless of the d3-zoom transform
		const base_transform =
			bbox.width > bbox.height ?
				{
					k: bbox.height / CANVAS_HEIGHT,
					y: 0,
					x: (bbox.width - bbox.height) / 2,
				}
			:	{
					k: bbox.width / CANVAS_WIDTH,
					x: 0,
					y: (bbox.height - bbox.width) / 2,
				};
		// apply transform to to mouse event coordinate, to get the viewbox coordinate
		const viewbox_coordinate = Coordinate.make({
			x: (container_coordinate.x - base_transform.x) / base_transform.k,
			y: (container_coordinate.y - base_transform.y) / base_transform.k,
		});
		// apply the d3 zoom
		const canvas_coordinate = Coordinate.make({
			x: Math.round((viewbox_coordinate.x - transform.x) / transform.k),
			y: Math.round((viewbox_coordinate.y - transform.y) / transform.k),
		});
		return {
			container: container_coordinate,
			viewbox: viewbox_coordinate,
			canvas: canvas_coordinate,
			canvas_rounded: canvas_coordinate.to_rounded(),
			stellaris: canvas_coordinate.to_stellaris_coordinate(),
		};
	}

	const custom_cursor = `url("${custom_crosshair}") 10 10, crosshair`;
</script>

<svelte:document
	onmouseup={(e) => {
		if (e.button !== 0) return;
		if (!ctx) return;
		if (Option.isSome(active_tool)) {
			if (active_tool.value.action_type === 'single_point' && tool_points[0]) {
				editor().apply_tool(active_tool.value.id, tool_points[0], ctx);
			} else if (tool_points.length > 1) {
				editor().apply_tool(active_tool.value.id, tool_points, ctx);
			}
			active_tool = Option.none();
			tool_points = [];
		}
	}}
	onkeydown={(e) => {
		if (e.key === 'Shift') {
			is_shift_pressed = true;
		}
	}}
	onkeyup={(e) => {
		if (e.key === 'Shift') {
			is_shift_pressed = false;
		}
	}}
/>
<main
	id={ID.canvas}
	bind:this={container}
	bind:clientHeight={container_height}
	class="canvas h-full w-full overflow-hidden"
	style:cursor={Option.match(current_tool, {
		onSome: () => custom_cursor,
		onNone: () => 'auto',
	})}
	style:width={CANVAS_WIDTH}
	style:height={CANVAS_HEIGHT}
	style:background={CANVAS_BACKGROUND}
	{...{
		// svelte does not yet have type defs for command events and listeners
		// spreading an object bypasses the strict type checking
		oncommand: (e: { command: string }) => {
			Match.value(e.command).pipe(
				Match.when(CUSTOM_COMMAND.reset_zoom, () => {
					if (svg) zoom_behavior.transform(select(svg), zoomIdentity);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_050, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 0.5);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_075, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 0.75);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_100, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 1);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_150, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 1.5);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_200, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 2);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_400, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 4);
				}),
				Match.when(CUSTOM_COMMAND.set_zoom_800, () => {
					if (svg) zoom_behavior.scaleTo(select(svg), 8);
				}),
				Match.orElseAbsurd,
			);
		},
	}}
	onmousedown={(e) => {
		if (e.button !== 0) return;
		if (Option.isSome(current_tool)) {
			pipe(
				current_tool,
				Option.map((value) => value.snap_to_solar_system),
				Option.getOrElse(() => false),
				Boolean.match({
					onTrue: () =>
						Option.map(snapped_solar_system, (system) => system.coordinate),
					onFalse: () => Option.some(get_mouse_coordinates(e).canvas),
				}),
				Option.match({
					onSome(value) {
						active_tool = current_tool;
						tool_points = [value];
					},
					onNone() {},
				}),
			);
		}
	}}
	onmousemove={(e) => {
		const coordinates = get_mouse_coordinates(e);
		mouse_coordinates = Option.some(coordinates);
		const snap_to_solar_system = pipe(
			active_tool,
			Option.orElse(() => current_tool),
			Option.map((value) => value.snap_to_solar_system),
			Option.getOrElse(() => false),
		);
		if (delaunay && snap_to_solar_system) {
			const solar_system_index = delaunay.find(
				coordinates.canvas.x,
				coordinates.canvas.y,
			);
			const solar_system = solar_systems[solar_system_index];
			snapped_solar_system = Option.fromNullable(solar_system);
		}
		const point =
			snap_to_solar_system ?
				Option.map(
					snapped_solar_system,
					(solar_system) => solar_system.coordinate,
				)
			:	Option.some(coordinates.canvas);
		if (Option.isSome(active_tool) && Option.isSome(point)) {
			Match.value(active_tool.value.action_type).pipe(
				Match.when('single_point', () => {
					tool_points = [point.value];
				}),
				Match.when('double_point', () => {
					if (tool_points.length === 0) {
						tool_points = [point.value];
					} else if (!Equal.equals(tool_points[0], point.value)) {
						tool_points = [tool_points[0]!, point.value];
					}
				}),
				Match.when('multi_point', () => {
					tool_points.push(point.value);
				}),
				Match.exhaustive,
			);
		}
	}}
	onmouseleave={() => {
		mouse_coordinates = Option.none();
		snapped_solar_system = Option.none();
	}}
>
	<svg
		bind:this={svg}
		class="w-full h-full"
		viewBox="0 0 {CANVAS_WIDTH} {CANVAS_HEIGHT}"
		width={CANVAS_WIDTH}
		height={CANVAS_HEIGHT}
	>
		<g transform="translate({transform.x},{transform.y}) scale({transform.k})">
			<foreignObject x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
				<canvas
					bind:this={canvas}
					width={CANVAS_WIDTH}
					height={CANVAS_HEIGHT}
					style:opacity={editor().step === 'paint' ? '100%'
					: editor().step === 'generate' ? '50%'
					: '0%'}
				></canvas>
			</foreignObject>
			{#if editor().view_settings.show_center_mark}
				<path
					d="M {CANVAS_WIDTH / 2} {CANVAS_HEIGHT / 2 - CENTER_MARK_SIZE}
					   L {CANVAS_WIDTH / 2} {CANVAS_HEIGHT / 2 + CENTER_MARK_SIZE}
					   M {CANVAS_WIDTH / 2 - CENTER_MARK_SIZE} {CANVAS_HEIGHT / 2}
					   L {CANVAS_WIDTH / 2 + CENTER_MARK_SIZE} {CANVAS_HEIGHT / 2}"
					fill="none"
					class="stroke-secondary-500"
					stroke-width="1"
				/>
			{/if}
			{#if editor().view_settings.show_map_limit}
				{@const pattern_size = 20}
				{@const stripe_size = 5}
				<pattern
					id="map_limit_pattern"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(-45)"
					height={pattern_size}
					width={pattern_size}
				>
					<rect height={pattern_size} width={pattern_size} />
					<rect
						height={stripe_size}
						width={pattern_size}
						class="fill-error-500/25"
					/>
				</pattern>
				<path
					d="M -1000000 -1000000
					   H 1000000
					   V 1000000
					   H-1000000
					   Z
					   M -1 -1
					   v {CANVAS_HEIGHT + 2}
					   h {CANVAS_WIDTH + 2}
					   v-{CANVAS_HEIGHT + 2}
					   Z"
					class="stroke-error-500"
					fill="url(#map_limit_pattern)"
					stroke-width="2"
				/>
			{/if}
			{#if editor().view_settings.show_l_cluster}
				{@const pattern_size = 20}
				{@const stripe_size = 5}
				<pattern
					id="l_cluster_pattern"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(-45)"
					height={pattern_size}
					width={pattern_size}
				>
					<rect height={pattern_size} width={pattern_size} fill="none" />
					<rect
						height={stripe_size}
						width={pattern_size}
						class="fill-warning-500/25"
					/>
				</pattern>
				<circle
					cx={CANVAS_WIDTH / 2 + 420}
					cy={CANVAS_HEIGHT / 2 - 420}
					r={70}
					class="stroke-warning-500"
					fill="url(#l_cluster_pattern)"
					stroke-width="2"
				/>
				<text
					x={CANVAS_WIDTH / 2 + 420}
					y={CANVAS_HEIGHT / 2 - 420}
					class="fill-warning-500"
					dominant-baseline="middle"
					text-anchor="middle"
					font-size={24}
				>
					L-Cluster
				</text>
			{/if}
			{#if Option.isSome(active_tool) && active_tool.value.render.type === 'stroke'}
				<path
					d={stroke_path}
					fill={active_tool.value.render.color}
					opacity={'opacity' in active_tool.value.default_settings ?
						editor().tool_settings[active_tool.value.id].opacity
					:	1}
				/>
			{/if}
			{#each nebulas as nebula (nebula.key)}
				<circle
					cx={nebula.coordinate.x}
					cy={nebula.coordinate.y}
					r={nebula.radius}
					fill="var(--color-tertiary-500)"
					fill-opacity="0.25"
					stroke="var(--color-tertiary-500)"
					stroke-width="1"
					stroke-opacity="0.5"
				/>
			{/each}
			{#each hyperlanes as connection (connection.key)}
				{@const from = project.get_solar_system(connection.a).coordinate}
				{@const to = project.get_solar_system(connection.b).coordinate}
				<line
					x1={from.x}
					y1={from.y}
					x2={to.x}
					y2={to.y}
					stroke={CANVAS_BACKGROUND}
					stroke-opacity="0.5"
					stroke-width="3"
				/>
				<line
					x1={from.x}
					y1={from.y}
					x2={to.x}
					y2={to.y}
					stroke="#FFFFFF"
					stroke-opacity="0.5"
					stroke-width="1"
				/>
			{/each}
			{#each wormholes as connection (connection.key)}
				{@const from = project.get_solar_system(connection.a).coordinate}
				{@const to = project.get_solar_system(connection.b).coordinate}
				<line
					x1={from.x}
					y1={from.y}
					x2={to.x}
					y2={to.y}
					stroke="var(--color-tertiary-600)"
					stroke-opacity="1"
					stroke-width="1"
					stroke-dasharray="3"
				/>
			{/each}
			{#each solar_systems as solar_system (solar_system.id)}
				{#if Option.match( active_tool, { onNone: () => Option.isSome(current_tool) && current_tool.value.snap_to_solar_system && Option.contains(snapped_solar_system, solar_system), onSome: (value) => value.snap_to_solar_system && tool_points.some(Equal.equals(solar_system.coordinate)) }, )}
					<circle
						cx={solar_system.coordinate.x}
						cy={solar_system.coordinate.y}
						r="5"
						fill="none"
						stroke="var(--color-primary-500)"
						stroke-width="1"
					/>
				{/if}
				{#if solar_system.spawn_type === 'preferred'}
					<path
						d="M {solar_system.coordinate.x} {solar_system.coordinate.y - 6}
						   l 2 4
						   l 4 2
						   l -4 2
						   l -2 4
						   l -2 -4
						   l -4 -2
						   l 4 -2
						   Z"
						fill="var(--color-secondary-500)"
						stroke="var(--color-surface-950)"
						stroke-width="1"
					/>
				{:else}
					<circle
						cx={solar_system.coordinate.x}
						cy={solar_system.coordinate.y}
						r={2.5}
						fill={solar_system.spawn_type === 'disabled' ?
							'var(--color-surface-50)'
						:	'var(--color-secondary-500)'}
						stroke="var(--color-surface-950)"
						stroke-width="1"
					/>
				{/if}
			{/each}
			{#if Option.isSome(active_tool) && active_tool.value.render.type === 'line' && tool_points.length > 1}
				<line
					x1={tool_points.at(0)?.x}
					y1={tool_points.at(0)?.y}
					x2={tool_points.at(-1)?.x}
					y2={tool_points.at(-1)?.y}
					stroke={active_tool.value.render.color}
				/>
			{/if}
		</g>
	</svg>
	{#if Option.isSome(mouse_coordinates)}
		{@const coordinates = Option.getOrThrow(mouse_coordinates)}
		<div
			class={[
				'absolute bottom-0 bg-surface-50/75 text-surface-950 px-1 pointer-events-none',
				{
					'right-0':
						coordinates.container.x < 100 &&
						coordinates.container.y > container_height - 24,
				},
			]}
		>
			{Math.round(coordinates.stellaris.x)}, {Math.round(
				coordinates.stellaris.y,
			)}
		</div>
	{/if}
</main>

<style>
	.canvas {
		position: relative;
		align-self: start;
		user-select: none;

		svg {
			position: absolute;
			top: 0;
			left: 0;

			* {
				pointer-events: none;
			}
		}
	}
</style>
