<script lang="ts">
	import {
		CANVAS_BACKGROUND,
		CANVAS_HEIGHT,
		CANVAS_WIDTH,
		CENTER_MARK_SIZE,
		CUSTOM_COMMAND,
		DETAILS_DEFAULT_HEIGHT,
		DETAILS_DEFAULT_WIDTH,
		FALLEN_EMPIRE_ZONE_RADIUS,
		GIGA_AETERNUM_CORE_RADIUS,
		GIGA_RANDOM_CORE_RADIUS,
		ID,
		L_CLUSTER_CX,
		L_CLUSTER_CY,
		L_CLUSTER_RADIUS,
	} from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { Coordinate } from '$lib/models/coordinate';
	import { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import type { Tool } from '$lib/models/tool';
	import { Delaunay } from 'd3-delaunay';
	import { select } from 'd3-selection';
	import { zoom, zoomIdentity, type D3ZoomEvent } from 'd3-zoom';
	import { Boolean, Equal, Match, Option, pipe } from 'effect';
	import custom_crosshair from './crosshair.svg?inline';
	import type { Nebula } from '$lib/models/nebula';
	import type { Project } from '$lib/models/project';
	import SolarSystemDetails from './solar_system_details.svelte';
	import FallenEmpireZoneDetails from './fallen_empire_zone_details.svelte';
	import ContextMenu from './context_menu.svelte';
	import { generate_grid_path, generate_grid_points } from '$lib/grid';
	import type {
		FallenEmpireZone,
		FallenEmpireZoneId,
	} from '$lib/models/fallen_empire_zone';

	const editor = get_editor();
	const project = $derived(editor().project);
	const solar_systems = $derived(project.solar_systems);
	const hyperlanes = $derived(project.hyperlanes);
	const wormholes = $derived(project.wormholes);
	const nebulas = $derived(project.nebulas);
	const fallen_empire_zones = $derived(project.fallen_empire_zones);

	let is_shift_pressed = $state(false);
	let is_left_pressed = $state(false);
	let is_right_pressed = $state(false);
	let is_up_pressed = $state(false);
	let is_down_pressed = $state(false);

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
	const current_tool_settings = $derived(
		pipe(
			current_tool,
			Option.map((tool) => editor().tool_settings[tool.id]),
		),
	);

	const grid_config = $derived(editor().project.grid_config);
	const grid_points = $derived(
		generate_grid_points(
			grid_config.type,
			grid_config.size,
			grid_config.rotate,
			grid_config.x_offset,
			grid_config.y_offset,
		),
	);
	const grid_delaunay = $derived(
		new Delaunay(
			grid_points.flatMap((grid_point) => [grid_point.x, grid_point.y]),
		),
	);

	let mouse_coordinates = $state.raw<
		Option.Option<{
			container: Coordinate;
			viewbox: Coordinate;
			canvas: Coordinate;
			stellaris: Coordinate;
			grid: Coordinate;
		}>
	>(Option.none());

	let active_tool = $state<Option.Option<Tool>>(Option.none());
	const active_tool_settings = $derived(
		pipe(
			active_tool,
			Option.map((tool) => editor().tool_settings[tool.id]),
		),
	);
	let snapped_solar_system_id = $state.raw<Option.Option<SolarSystemId>>(
		Option.none(),
	);
	const snapped_solar_system = $derived(
		pipe(
			snapped_solar_system_id,
			Option.flatMap((id) => project.get_solar_system(id)),
		),
	);
	let tool_points = $state<Coordinate[]>([]);
	let stroke_path = $derived(
		pipe(
			active_tool,
			Option.orElse(() =>
				(
					Option.exists(current_tool, (tool) => tool.show_preview) &&
					Option.isSome(mouse_coordinates)
				) ?
					current_tool
				:	Option.none(),
			),
			Option.map((tool) => {
				const points =
					tool_points.length === 0 ?
						pipe(
							mouse_coordinates,
							Option.map((value) =>
								tool.action_type === 'double_point' ?
									[value.canvas, value.canvas]
								:	[value.canvas],
							),
						)
					:	Option.some(tool_points);
				return Option.match(points, {
					onNone: () => '',
					onSome: (points) => editor().calculate_path(tool.id, points),
				});
			}),
			Option.getOrElse(() => ''),
		),
	);

	const solar_system_delaunay = $derived(
		solar_systems.length > 0 ?
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
			context_menu_data = Option.none();
			transform = e.transform;
		});
	$effect(() => {
		if (svg) select(svg).call(zoom_behavior);
	});
	// pan with wasd / arrows
	$effect(() => {
		const TRANSLATE_SPEED = 1000; // canvas px per second
		let canceled = false;
		let dx = 0;
		let dy = 0;
		if (is_up_pressed) dy += TRANSLATE_SPEED / transform.k;
		if (is_down_pressed) dy -= TRANSLATE_SPEED / transform.k;
		if (is_left_pressed) dx += TRANSLATE_SPEED / transform.k;
		if (is_right_pressed) dx -= TRANSLATE_SPEED / transform.k;
		if (svg != null && (dx != 0 || dy !== 0)) {
			const selection = select(svg);
			let last_time = performance.now();
			function on_animation_frame() {
				if (!canceled) {
					const new_time = performance.now();
					const dt = new_time - last_time;
					last_time = new_time;
					zoom_behavior.translateBy(
						selection,
						(dx * dt) / 1000,
						(dy * dt) / 1000,
					);
					requestAnimationFrame(on_animation_frame);
				}
			}
			requestAnimationFrame(on_animation_frame);
			return () => {
				canceled = true;
			};
		} else {
			return;
		}
	});

	function get_mouse_coordinates(
		event: { clientX: number; clientY: number },
		grid_points: Coordinate[],
		grid_delaunay: Delaunay<unknown>,
	) {
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

		const snapped_grid_point_index = grid_delaunay.find(
			canvas_coordinate.x,
			canvas_coordinate.y,
		);
		const grid_coordinate = grid_points[snapped_grid_point_index]!;

		return {
			container: container_coordinate,
			viewbox: viewbox_coordinate,
			canvas: canvas_coordinate,
			canvas_rounded: canvas_coordinate.to_rounded(),
			stellaris: canvas_coordinate.to_stellaris_coordinate(),
			grid: grid_coordinate,
		};
	}

	const custom_cursor = `url("${custom_crosshair}") 10 10, crosshair`;
	const warning_pattern_size = 20;
	const warning_pattern_stripe_size = 5;
	const fe_zone_pattern_size = 10;
	const fe_zone_pattern_stripe_size = 5;

	let context_menu_data = $state.raw<
		Option.Option<{
			solar_system: Option.Option<SolarSystem>;
			fallen_empire_zones: FallenEmpireZone[];
			nebulas: Nebula[];
			coordinate: Coordinate;
			coordinate_has_solar_system: boolean;
		}>
	>(Option.none());

	function update_context_menu_data(project: Project, coordinate: Coordinate) {
		const coordinate_has_solar_system = project.solar_systems.some(
			(solar_system) =>
				Equal.equals(solar_system.coordinate, coordinate.to_rounded()),
		);
		let solar_system: Option.Option<SolarSystem> = Option.none();
		if (solar_system_delaunay) {
			const solar_system_index = solar_system_delaunay.find(
				coordinate.x,
				coordinate.y,
			);
			solar_system = Option.fromNullable(
				project.solar_systems[solar_system_index],
			);
		}
		const nebulas = project.nebulas.filter(
			(nebula) => nebula.coordinate.distance_to(coordinate) <= nebula.radius,
		);
		const fallen_empire_zones = project.fallen_empire_zones.filter((zone) => {
			const center = project.get_fallen_empire_zone_coordinate_unsafe(zone);
			return center.distance_to(coordinate) < FALLEN_EMPIRE_ZONE_RADIUS;
		});
		context_menu_data = Option.some({
			coordinate,
			coordinate_has_solar_system,
			nebulas,
			fallen_empire_zones,
			solar_system,
		});
	}

	let solar_system_details_position = $state({
		x: document.body.clientWidth / 2 - DETAILS_DEFAULT_WIDTH / 2,
		y: document.body.clientHeight / 2 - DETAILS_DEFAULT_HEIGHT / 2,
	});
	let solar_system_details_size = $state({
		width: DETAILS_DEFAULT_WIDTH,
		height: DETAILS_DEFAULT_HEIGHT,
	});
	let details_opened_solar_system_id = $state.raw<Option.Option<SolarSystemId>>(
		Option.none(),
	);
	const details_opened_solar_system = $derived(
		Option.flatMap(details_opened_solar_system_id, (value) =>
			editor().project.get_solar_system(value),
		),
	);

	let fe_details_position = $state({
		x: document.body.clientWidth / 2 - DETAILS_DEFAULT_WIDTH / 2 + 40,
		y: document.body.clientHeight / 2 - DETAILS_DEFAULT_HEIGHT / 2 + 40,
	});
	let fe_details_size = $state({
		width: DETAILS_DEFAULT_WIDTH,
		height: DETAILS_DEFAULT_HEIGHT,
	});
	let details_opened_fe_zone_id = $state.raw<Option.Option<FallenEmpireZoneId>>(
		Option.none(),
	);
	const details_opened_fe_zone = $derived(
		Option.flatMapNullable(details_opened_fe_zone_id, (id) =>
			fallen_empire_zones.find((z) => z.id === id),
		),
	);
</script>

<svelte:document
	onmouseup={(e) => {
		if (e.button !== 0) return;
		if (!ctx) return;
		if (Option.isSome(active_tool) && Option.isSome(active_tool_settings)) {
			// correct the snapped system
			// this will run for no-ops (locked systems) too, but not a big deal
			const moved_solar_system =
				(
					active_tool.value.id === 'solar_system_move' ||
					active_tool.value.id === 'cluster_move'
				) ?
					project.solar_systems.find((solar_system) =>
						Equal.equals(solar_system.coordinate, tool_points[0]),
					)
				:	null;
			if (moved_solar_system) {
				snapped_solar_system_id = Option.some(moved_solar_system.id);
			}
			// apply tool
			if (
				active_tool.value.action_type === 'single_point' &&
				active_tool_settings.value.bulk === 0 &&
				tool_points[0]
			) {
				editor().apply_tool(active_tool.value.id, tool_points[0], ctx);
			} else {
				editor().apply_tool(active_tool.value.id, tool_points, ctx);
			}
			// clear tool
			active_tool = Option.none();
			tool_points = [];
		}
	}}
	onkeydown={(e) => {
		const active_element = document.activeElement;
		const is_editing_text =
			active_element != null &&
			'selectionStart' in active_element &&
			active_element.selectionStart != null;
		if (is_editing_text) return;

		if (e.key === 'Shift') {
			is_shift_pressed = true;
		}
		if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
			is_left_pressed = true;
		}
		if (e.code === 'KeyD' || e.code === 'ArrowRight') {
			is_right_pressed = true;
		}
		if (e.code === 'KeyS' || e.code === 'ArrowDown') {
			is_down_pressed = true;
		}
		if (e.code === 'KeyW' || e.code === 'ArrowUp') {
			is_up_pressed = true;
		}
	}}
	onkeyup={(e) => {
		if (e.key === 'Shift') {
			is_shift_pressed = false;
		}
		if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
			is_left_pressed = false;
		}
		if (e.code === 'KeyD' || e.code === 'ArrowRight') {
			is_right_pressed = false;
		}
		if (e.code === 'KeyS' || e.code === 'ArrowDown') {
			is_down_pressed = false;
		}
		if (e.code === 'KeyW' || e.code === 'ArrowUp') {
			is_up_pressed = false;
		}
	}}
/>

<SolarSystemDetails
	solar_system_id={details_opened_solar_system_id}
	on_close_requested={() => {
		details_opened_solar_system_id = Option.none();
	}}
	bind:position={solar_system_details_position}
	bind:size={solar_system_details_size}
/>

<FallenEmpireZoneDetails
	zone={details_opened_fe_zone}
	on_close_requested={() => {
		details_opened_fe_zone_id = Option.none();
	}}
	bind:position={fe_details_position}
	bind:size={fe_details_size}
/>

<main
	id={ID.canvas}
	bind:this={container}
	bind:clientHeight={container_height}
	class="canvas h-full w-full overflow-hidden"
	style:cursor={Option.match(current_tool, {
		onSome: (tool) =>
			(
				tool.snap_to_solar_system !== 'none' &&
				editor().tool_settings[tool.id].bulk === 0 &&
				Option.exists(
					snapped_solar_system,
					(system) => system.locked !== tool.invert_lock_behavior,
				)
			) ?
				'not-allowed'
			:	custom_cursor,
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
		if (Option.isSome(context_menu_data)) {
			if (e.button === 2 && Option.isSome(mouse_coordinates)) {
				update_context_menu_data(project, mouse_coordinates.value.canvas);
			}
			return;
		}
		if (e.button !== 0) return;
		if (Option.isSome(current_tool) && Option.isSome(current_tool_settings)) {
			pipe(
				current_tool,
				Option.map(
					(value) =>
						value.snap_to_solar_system !== 'none' &&
						current_tool_settings.value.bulk === 0,
				),
				Option.getOrElse(() => false),
				Boolean.match({
					onTrue: () =>
						Option.flatMap(snapped_solar_system, (system) =>
							system.locked !== current_tool.value.invert_lock_behavior ?
								Option.none()
							:	Option.some(system.coordinate),
						),
					onFalse: () =>
						Option.some(
							get_mouse_coordinates(e, grid_points, grid_delaunay)[
								grid_config.snap && current_tool.value.can_snap_to_grid ?
									'grid'
								:	'canvas'
							],
						),
				}),
				Option.match({
					onSome(value) {
						active_tool = current_tool;
						tool_points =
							current_tool.value.action_type === 'double_point' ?
								[value, value]
							:	[value];
					},
					onNone() {},
				}),
			);
		}
	}}
	onmousemove={(e) => {
		const coordinates = get_mouse_coordinates(e, grid_points, grid_delaunay);
		mouse_coordinates = Option.some(coordinates);
		const tool = Option.orElse(active_tool, () => current_tool);
		const snap_to_solar_system = pipe(
			tool,
			Option.map((value) => {
				if (value.snap_to_solar_system === 'all') {
					return editor().tool_settings[value.id].bulk === 0;
				}
				if (value.snap_to_solar_system === 'first') {
					return (
						Option.isNone(active_tool) &&
						editor().tool_settings[value.id].bulk === 0
					);
				}
				return false;
			}),
			Option.getOrElse(() => false),
		);
		if (solar_system_delaunay) {
			const solar_system_index = solar_system_delaunay.find(
				coordinates.canvas.x,
				coordinates.canvas.y,
			);
			const solar_system = solar_systems[solar_system_index];
			snapped_solar_system_id = Option.fromNullable(solar_system?.id);
		}
		const point =
			snap_to_solar_system ?
				Option.flatMap(snapped_solar_system, (solar_system) =>
					solar_system.locked ?
						Option.none()
					:	Option.some(solar_system.coordinate),
				)
			: (
				grid_config.snap &&
				Option.exists(tool, (value) => value.can_snap_to_grid)
			) ?
				Option.some(coordinates.grid)
			:	Option.some(coordinates.canvas);
		if (
			Option.isSome(active_tool) &&
			Option.isSome(active_tool_settings) &&
			Option.isSome(point)
		) {
			Match.value(active_tool.value.action_type).pipe(
				Match.when('single_point', () => {
					if (active_tool_settings.value.bulk === 0) {
						tool_points = [point.value];
					} else {
						if (!Equal.equals(tool_points.at(-1), point.value)) {
							tool_points.push(point.value);
						}
					}
				}),
				Match.when('double_point', () => {
					if (tool_points.length === 0) {
						tool_points = [point.value, point.value];
					} else if (!Equal.equals(tool_points[0], point.value)) {
						tool_points = [tool_points[0]!, point.value];
					}
				}),
				Match.when('multi_point', () => {
					if (!Equal.equals(tool_points.at(-1), point.value)) {
						tool_points.push(point.value);
					}
				}),
				Match.exhaustive,
			);
		}
	}}
	onmouseleave={() => {
		mouse_coordinates = Option.none();
		snapped_solar_system_id = Option.none();
	}}
>
	<ContextMenu
		data={context_menu_data}
		on_open={() => {
			if (Option.isSome(mouse_coordinates)) {
				update_context_menu_data(project, mouse_coordinates.value.canvas);
			}
		}}
		on_close={() => {
			context_menu_data = Option.none();
		}}
		ctx={ctx!}
		open_solar_system_details={(id) => {
			details_opened_solar_system_id = Option.some(id);
		}}
		open_fallen_empire_zone_details={(id) => {
			details_opened_fe_zone_id = Option.some(id);
		}}
	>
		<svg
			bind:this={svg}
			class="w-full h-full"
			viewBox="0 0 {CANVAS_WIDTH} {CANVAS_HEIGHT}"
			width={CANVAS_WIDTH}
			height={CANVAS_HEIGHT}
		>
			<g
				transform="translate({transform.x},{transform.y}) scale({transform.k})"
			>
				<foreignObject x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
					<canvas
						bind:this={canvas}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						style:opacity={editor().current_step_canvas_opacity}
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
				<pattern
					id="warning_pattern"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(-45)"
					height={warning_pattern_size}
					width={warning_pattern_size}
				>
					<rect
						height={warning_pattern_size}
						width={warning_pattern_size}
						fill="none"
					/>
					<rect
						height={warning_pattern_stripe_size}
						width={warning_pattern_size}
						class="fill-warning-500/25"
					/>
				</pattern>
				<pattern
					id="fe_zone_pattern"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(-45)"
					height={fe_zone_pattern_size}
					width={fe_zone_pattern_size}
				>
					<rect
						height={fe_zone_pattern_size}
						width={fe_zone_pattern_size}
						fill="none"
					/>
					<rect
						height={fe_zone_pattern_stripe_size}
						width={fe_zone_pattern_size}
						class="fill-secondary-500/25"
					/>
				</pattern>
				{#if editor().view_settings.show_l_cluster}
					<circle
						cx={L_CLUSTER_CX}
						cy={L_CLUSTER_CY}
						r={L_CLUSTER_RADIUS}
						class="stroke-warning-500"
						fill="url(#warning_pattern)"
						stroke-width="2"
					/>
					<text
						x={L_CLUSTER_CX}
						y={L_CLUSTER_CY}
						class="fill-warning-500"
						dominant-baseline="middle"
						text-anchor="middle"
						font-size={24}
					>
						L-Cluster
					</text>
				{/if}
				{#if editor().view_settings.show_giga_core}
					<circle
						cx={CANVAS_WIDTH / 2}
						cy={CANVAS_HEIGHT / 2}
						r={GIGA_RANDOM_CORE_RADIUS}
						class="stroke-warning-500"
						fill="url(#warning_pattern)"
						stroke-width="2"
					/>
				{/if}
				{#if editor().view_settings.show_giga_aeternum}
					<circle
						cx={CANVAS_WIDTH / 2}
						cy={CANVAS_HEIGHT / 2}
						r={GIGA_AETERNUM_CORE_RADIUS}
						class="stroke-warning-500"
						fill="url(#warning_pattern)"
						stroke-width="2"
					/>
				{/if}
				{#if editor().view_settings.show_giga_core || editor().view_settings.show_giga_aeternum}
					<text
						x={CANVAS_WIDTH / 2}
						y={CANVAS_HEIGHT / 2}
						class="fill-warning-500"
						dominant-baseline="middle"
						text-anchor="middle"
						font-size={24}
					>
						Core
					</text>
				{/if}
				{#if stroke_path !== '' && Option.isSome(Option.orElse(active_tool, () => current_tool))}
					{@const tool = pipe(
						active_tool,
						Option.orElse(() => current_tool),
						Option.getOrThrow,
					)}
					<path
						d={stroke_path}
						fill={tool.render.color}
						opacity={'opacity' in tool.default_settings ?
							editor().tool_settings[tool.id].opacity
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
					{@const from = project.get_solar_system_unsafe(
						connection.a,
					).coordinate}
					{@const to = project.get_solar_system_unsafe(connection.b).coordinate}
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
					{@const from = project.get_solar_system_unsafe(
						connection.a,
					).coordinate}
					{@const to = project.get_solar_system_unsafe(connection.b).coordinate}
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

				{#each fallen_empire_zones as zone (zone.id)}
					{@const center =
						project.get_fallen_empire_zone_coordinate_unsafe(zone)}
					{@const connections = zone.connections}
					<circle
						cx={center.x}
						cy={center.y}
						r={FALLEN_EMPIRE_ZONE_RADIUS}
						fill="url(#fe_zone_pattern)"
						class="stroke-secondary-500"
						stroke-width="2"
					/>
					<text
						x={center.x}
						y={center.y}
						class="fill-secondary-300"
						dominant-baseline="middle"
						text-anchor="middle"
						font-size={10}
					>
						{zone.type}
					</text>
					{#each connections as connected_id (connected_id)}
						{@const connected = project.get_solar_system(connected_id)}
						{#if Option.isSome(connected)}
							<line
								x1={center.x}
								y1={center.y}
								x2={connected.value.coordinate.x}
								y2={connected.value.coordinate.y}
								class="stroke-secondary-500"
								stroke-width="1"
							/>
						{/if}
					{/each}
					{#if editor().warned_fallen_empire_zone_ids.includes(zone.id)}
						<circle
							cx={center.x}
							cy={center.y}
							r={FALLEN_EMPIRE_ZONE_RADIUS}
							fill="none"
							class="fill-warning-500/25 stroke-warning-500"
							stroke-width="2"
						/>
					{/if}
				{/each}

				<!-- connecting line from details box to solar system -->
				{#if Option.isSome(details_opened_solar_system)}
					{@const solar_system = details_opened_solar_system.value}
					{@const details_coordinate = get_mouse_coordinates(
						{
							clientX:
								solar_system_details_position.x +
								solar_system_details_size.width / 2,
							clientY:
								solar_system_details_position.y +
								solar_system_details_size.height / 2,
						},
						grid_points,
						grid_delaunay,
					).canvas}
					<line
						class="stroke-primary-500"
						stroke-width={3 / transform.k}
						x1={solar_system.coordinate.x}
						y1={solar_system.coordinate.y}
						x2={details_coordinate.x}
						y2={details_coordinate.y}
					/>
				{/if}

				<!-- connecting line from details box to fallen empire zone -->
				{#if Option.isSome(details_opened_fe_zone)}
					{@const zone_coordinate = project.get_fallen_empire_zone_coordinate(
						details_opened_fe_zone.value,
					)}
					{#if Option.isSome(zone_coordinate)}
						{@const details_coordinate = get_mouse_coordinates(
							{
								clientX: fe_details_position.x + fe_details_size.width / 2,
								clientY: fe_details_position.y + fe_details_size.height / 2,
							},
							grid_points,
							grid_delaunay,
						).canvas}
						<line
							class="stroke-primary-500"
							stroke-width={3 / transform.k}
							x1={zone_coordinate.value.x}
							y1={zone_coordinate.value.y}
							x2={details_coordinate.x}
							y2={details_coordinate.y}
						/>
					{/if}
				{/if}

				{#each solar_systems as solar_system (solar_system.id)}
					{@const stroke =
						solar_system.locked ?
							'var(--color-warning-500)'
						:	'var(--color-surface-950)'}
					{#if editor().warned_solar_system_ids.includes(solar_system.id)}
						<circle
							cx={solar_system.coordinate.x}
							cy={solar_system.coordinate.y}
							r={7}
							fill="none"
							class="fill-warning-500/25 stroke-warning-500"
							stroke-width="2"
						/>
					{/if}
					{#if Option.match( context_menu_data, { onNone: () => Option.match( active_tool, { onNone: () => Option.contains(snapped_solar_system, solar_system), onSome: (value) => value.snap_to_solar_system !== 'none' && tool_points.some(Equal.equals(solar_system.coordinate)) }, ), onSome: (value) => Option.contains(value.solar_system, solar_system) }, )}
						<circle
							cx={solar_system.coordinate.x}
							cy={solar_system.coordinate.y}
							r={(
								solar_system.spawn_type === 'disabled' ||
								solar_system.spawn_type === 'enabled'
							) ?
								5
							:	7}
							fill="none"
							stroke="var(--color-primary-500)"
							stroke-width="2"
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
							{stroke}
							stroke-width="1"
						/>
					{:else if solar_system.spawn_type.startsWith('reserved')}
						{@const outer_r = 7}
						{@const outer_dx = outer_r * Math.cos(Math.PI / 6)}
						{@const outer_dy = outer_r * Math.sin(Math.PI / 6)}
						{@const inner_r = 4}
						{@const inner_dx = inner_r * Math.sin(Math.PI / 6)}
						{@const inner_dy = inner_r * Math.cos(Math.PI / 6)}
						<path
							d="
							M {solar_system.coordinate.x} {solar_system.coordinate.y - outer_r}
							L {solar_system.coordinate.x - inner_dx} {solar_system.coordinate.y - inner_dy}
							L {solar_system.coordinate.x - outer_dx} {solar_system.coordinate.y - outer_dy}
							L {solar_system.coordinate.x - inner_r} {solar_system.coordinate.y}
							L {solar_system.coordinate.x - outer_dx} {solar_system.coordinate.y + outer_dy}
							L {solar_system.coordinate.x - inner_dx} {solar_system.coordinate.y + inner_dy}
							L {solar_system.coordinate.x} {solar_system.coordinate.y + outer_r}
							L {solar_system.coordinate.x + inner_dx} {solar_system.coordinate.y + inner_dy}
							L {solar_system.coordinate.x + outer_dx} {solar_system.coordinate.y + outer_dy}
							L {solar_system.coordinate.x + inner_r} {solar_system.coordinate.y}
							L {solar_system.coordinate.x + outer_dx} {solar_system.coordinate.y - outer_dy}
							L {solar_system.coordinate.x + inner_dx} {solar_system.coordinate.y - inner_dy}
							Z"
							fill="var(--color-secondary-500)"
							{stroke}
							stroke-width="1"
						/>
						<text
							x={solar_system.coordinate.x}
							y={solar_system.coordinate.y + 0.5}
							class="fill-secondary-950 font-bold"
							dominant-baseline="middle"
							text-anchor="middle"
							font-size={7}
						>
							{solar_system.spawn_type.at(-1)?.toUpperCase()}
						</text>
					{:else if solar_system.spawn_type !== 'disabled'}
						<circle
							cx={solar_system.coordinate.x}
							cy={solar_system.coordinate.y}
							r={3.5}
							fill="var(--color-secondary-500)"
							{stroke}
							stroke-width="1"
						/>
					{:else if Option.isSome(solar_system.get_initializer()) || Option.isSome(solar_system.get_name())}
						{@const size = 6}
						<rect
							x={solar_system.coordinate.x - size / 2}
							y={solar_system.coordinate.y - size / 2}
							width={size}
							height={size}
							fill="var(--color-secondary-100)"
							{stroke}
							stroke-width="1"
						/>
					{:else}
						<circle
							cx={solar_system.coordinate.x}
							cy={solar_system.coordinate.y}
							r={2.5}
							fill="var(--color-surface-50)"
							{stroke}
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
				{#if editor().project.grid_config.snap}
					{@const grid_config = editor().project.grid_config}
					<clipPath id="grid-clip">
						<rect
							x={0}
							y={0}
							width={CANVAS_WIDTH}
							height={CANVAS_HEIGHT}
							transform="rotate({-grid_config.rotate}) translate({-grid_config.x_offset}, {-grid_config.y_offset})"
							transform-origin="center"
						/>
					</clipPath>
					<path
						clip-path="url(#grid-clip)"
						d={generate_grid_path(grid_config.type, grid_config.size)}
						class="fill-none stroke-secondary-500/25"
						transform="translate({grid_config.x_offset}, {grid_config.y_offset}) rotate({grid_config.rotate}) "
						transform-origin="center"
					/>
					<!-- <g>
						{#each generate_grid_points(grid_config.type, grid_config.size, grid_config.rotate, grid_config.x_offset, grid_config.y_offset) as point (point.key)}
							<circle fill="magenta" cx={point.x} cy={point.y} r={1} />
						{/each}
					</g> -->
					{#if Option.isSome(mouse_coordinates)}
						{@const coordinate = mouse_coordinates.value.grid}
						<g
							transform="translate({coordinate.x},{coordinate.y}) scale({1 /
								transform.k})"
							transform-origin="{coordinate.x},${coordinate.y}"
						>
							<g class="stroke-primary-500" stroke-width="2">
								<line x1="10" x2="4" y1="0" y2="0" />
								<line x1="-4" x2="-10" y1="0" y2="0" />
								<line x1="0" x2="0" y1="-4" y2="-10" />
								<line x1="0" x2="0" y1="10" y2="4" />
							</g>
						</g>
					{/if}
				{/if}
			</g>
		</svg>
	</ContextMenu>

	{#if Option.isSome(mouse_coordinates)}
		{@const coordinates = Option.getOrThrow(mouse_coordinates)}
		<div
			class={[
				'absolute bottom-0 bg-surface-50/75 text-surface-950 px-1 pointer-events-none text-xs',
				{
					'right-0':
						coordinates.container.x < 240 &&
						coordinates.container.y > container_height - 60,
				},
			]}
		>
			{Math.round(coordinates.stellaris.x)}, {Math.round(
				coordinates.stellaris.y,
			)}

			{#if grid_config.snap}
				{@const stellaris_coordinate = coordinates.grid
					.to_stellaris_coordinate()
					.to_rounded()}
				<div>
					snapped to
					{stellaris_coordinate.x}, {stellaris_coordinate.y}
				</div>
			{/if}

			{#if Option.isSome(snapped_solar_system)}
				{@const stellaris_coordinate =
					snapped_solar_system.value.coordinate.to_stellaris_coordinate()}
				<div>
					closest system
					{#if Option.isSome(snapped_solar_system.value.get_name())}
						<em>
							{snapped_solar_system.value.get_name().pipe(Option.getOrThrow)}
						</em>
					{/if}
					{stellaris_coordinate.x}, {stellaris_coordinate.y}
				</div>
			{/if}
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
