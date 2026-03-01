import { Schema, Record } from 'effect';
import type { Step } from './step';
import type { Coordinate } from './coordinate';
import { CANVAS_BACKGROUND } from '$lib/constants';
import type { Icons } from '$lib/components/icons';

export const ToolId = Schema.Literal(
	// paint
	'freehand_draw',
	'freehand_erase',
	'circle_draw',
	'circle_erase',
	// tweak
	'hyperlane_toggle',
	'nebula_create',
	'nebula_delete',
	'solar_system_create',
	'solar_system_delete',
	'spawn_preferred_toggle',
	'spawn_toggle',
	'wormhole_toggle',
);
export type ToolId = typeof ToolId.Type;

export const ToolSettingId = Schema.Literal('size', 'blur', 'opacity');
export type ToolSettingId = typeof ToolSettingId.Type;

export const ToolSettings = Schema.Record({
	key: ToolSettingId,
	value: Schema.OptionFromNullishOr(Schema.Number, null),
});
export type ToolSettings = typeof ToolSettings.Type;

interface _Tool<
	Id extends ToolId,
	ActionType extends 'single_point' | 'double_point' | 'multi_point',
	Settings extends Partial<Record<ToolSettingId, number>>,
> {
	id: Id;
	name: string;
	description?: string;
	step: Step;
	action_type: ActionType;
	default_settings: Settings;
	snap_to_solar_system: boolean;
	render: {
		type: 'line' | 'stroke' | 'none';
		color: string;
	};
}

const freehand_draw: _Tool<
	'freehand_draw',
	'multi_point',
	{ size: number; blur: number; opacity: number }
> = {
	id: 'freehand_draw',
	name: 'Draw Freehand',
	step: 'paint',
	action_type: 'multi_point',
	snap_to_solar_system: false,
	render: {
		type: 'stroke',
		color: 'white',
	},
	default_settings: {
		size: 25,
		blur: 0,
		opacity: 0.5,
	},
};

const freehand_erase: _Tool<
	'freehand_erase',
	'multi_point',
	{ size: number; blur: number; opacity: number }
> = {
	id: 'freehand_erase',
	name: 'Erase Freehand',
	step: 'paint',
	action_type: 'multi_point',
	snap_to_solar_system: false,
	render: {
		type: 'stroke',
		color: CANVAS_BACKGROUND,
	},
	default_settings: {
		size: 25,
		blur: 0,
		opacity: 0.5,
	},
};

const circle_draw: _Tool<
	'circle_draw',
	'double_point',
	{ blur: number; opacity: number }
> = {
	id: 'circle_draw',
	name: 'Draw Circle',
	step: 'paint',
	action_type: 'double_point',
	snap_to_solar_system: false,
	render: {
		type: 'stroke',
		color: 'white',
	},
	default_settings: {
		blur: 0,
		opacity: 0.5,
	},
};

const circle_erase: _Tool<
	'circle_erase',
	'double_point',
	{ blur: number; opacity: number }
> = {
	id: 'circle_erase',
	name: 'Erase Circle',
	step: 'paint',
	action_type: 'double_point',
	snap_to_solar_system: false,
	render: {
		type: 'stroke',
		color: CANVAS_BACKGROUND,
	},
	default_settings: {
		blur: 0,
		opacity: 0.5,
	},
};

const hyperlane_toggle: _Tool<
	'hyperlane_toggle',
	'double_point',
	Record<string, never>
> = {
	id: 'hyperlane_toggle',
	name: 'Toggle Hyperlane',
	description: 'Connect/disconnect 2 systems with a hyperlane.',
	step: 'tweak',
	action_type: 'double_point',
	snap_to_solar_system: true,
	render: {
		type: 'line',
		color: 'var(--color-primary-500)',
	},
	default_settings: {},
};

const nebula_create: _Tool<
	'nebula_create',
	'double_point',
	Record<string, never>
> = {
	id: 'nebula_create',
	name: 'Create Nebula',
	description:
		'Create a nebula. A non-circular nebula can be created by overlapping multiple circles.',
	step: 'tweak',
	action_type: 'double_point',
	snap_to_solar_system: false,
	render: {
		type: 'stroke',
		color: 'var(--color-primary-500)',
	},
	default_settings: {},
};

const nebula_delete: _Tool<
	'nebula_delete',
	'single_point',
	Record<string, never>
> = {
	id: 'nebula_delete',
	name: 'Delete Nebula',
	description:
		'Delete a nebula. If there are overlapping nebulas, only the smallest is deleted.',
	step: 'tweak',
	action_type: 'single_point',
	snap_to_solar_system: false,
	render: {
		type: 'none',
		color: 'none',
	},
	default_settings: {},
};

const solar_system_create: _Tool<
	'solar_system_create',
	'single_point',
	Record<string, never>
> = {
	id: 'solar_system_create',
	name: 'Create Solar System',
	description:
		'Create a solar system. Hyperlanes need to be created or generated separated.',
	step: 'tweak',
	action_type: 'single_point',
	snap_to_solar_system: false,
	render: {
		type: 'none',
		color: 'none',
	},
	default_settings: {},
};

const solar_system_delete: _Tool<
	'solar_system_delete',
	'single_point',
	Record<string, never>
> = {
	id: 'solar_system_delete',
	name: 'Delete Solar System',
	description:
		'Delete the closest solar system and any connected hyperlanes or wormholes.',
	step: 'tweak',
	action_type: 'single_point',
	snap_to_solar_system: true,
	render: {
		type: 'none',
		color: 'none',
	},
	default_settings: {},
};

const spawn_preferred_toggle: _Tool<
	'spawn_preferred_toggle',
	'single_point',
	Record<string, never>
> = {
	id: 'spawn_preferred_toggle',
	name: 'Toggle Preferred Spawn',
	description:
		'Mark/unmark preferred spawn. These are used first (ie by the player; unreliable in multiplayer).',
	step: 'tweak',
	action_type: 'single_point',
	snap_to_solar_system: true,
	render: {
		type: 'none',
		color: 'none',
	},
	default_settings: {},
};

const spawn_toggle: _Tool<
	'spawn_toggle',
	'single_point',
	Record<string, never>
> = {
	id: 'spawn_toggle',
	name: 'Toggle Spawn',
	description:
		'Mark/unmark spawn. Only "normal" empires use these (not Fallen Empires or Marauders).',
	step: 'tweak',
	action_type: 'single_point',
	snap_to_solar_system: true,
	render: {
		type: 'none',
		color: 'none',
	},
	default_settings: {},
};

const wormhole_toggle: _Tool<
	'wormhole_toggle',
	'double_point',
	Record<string, never>
> = {
	id: 'wormhole_toggle',
	name: 'Toggle Wormhole',
	description:
		'Connect/disconnect 2 systems with a wormhole. Each system can have only 1 wormhole.',
	step: 'tweak',
	action_type: 'double_point',
	snap_to_solar_system: true,
	render: {
		type: 'line',
		color: 'var(--color-primary-500)',
	},
	default_settings: {},
};

export type ToolActionTypePayload = {
	multi_point: Coordinate[];
	single_point: Coordinate;
	double_point: [Coordinate, Coordinate];
};

export const tools = {
	freehand_draw,
	freehand_erase,
	circle_draw,
	circle_erase,
	solar_system_create,
	solar_system_delete,
	spawn_toggle,
	spawn_preferred_toggle,
	hyperlane_toggle,
	wormhole_toggle,
	nebula_create,
	nebula_delete,
} satisfies Record<
	ToolId,
	_Tool<
		ToolId,
		'single_point' | 'double_point' | 'multi_point',
		Record<never, number>
	>
>;

export type Tool = (typeof tools)[keyof typeof tools];

interface ToolPair {
	id: string;
	name: string;
	step: Step;
	primary: Tool;
	secondary: Tool;
	icon: keyof typeof Icons;
}

export const tool_pairs: ToolPair[] = [
	{
		id: 'freehand',
		name: 'Freehand',
		step: 'paint',
		primary: tools.freehand_draw,
		secondary: tools.freehand_erase,
		icon: 'LineSquiggle',
	},
	{
		id: 'circle',
		name: 'Circle',
		step: 'paint',
		primary: tools.circle_draw,
		secondary: tools.circle_erase,
		icon: 'Circle',
	},
	{
		id: 'solar-system',
		name: 'Create/Delete Solar System',
		step: 'tweak',
		primary: tools.solar_system_create,
		secondary: tools.solar_system_delete,
		icon: 'Sparkle',
	},
	{
		id: 'hyperlane',
		name: 'Toggle Hyperlane/Wormhole',
		step: 'tweak',
		primary: tools.hyperlane_toggle,
		secondary: tools.wormhole_toggle,
		icon: 'Waypoints',
	},
	{
		id: 'spawn',
		name: 'Toggle Spawn',
		step: 'tweak',
		primary: tools.spawn_toggle,
		secondary: tools.spawn_preferred_toggle,
		icon: 'MapPin',
	},
	{
		id: 'nebula',
		name: 'Create/Delete Nebula',
		step: 'tweak',
		primary: tools.nebula_create,
		secondary: tools.nebula_delete,
		icon: 'Cloud',
	},
];
