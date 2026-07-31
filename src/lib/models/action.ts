import { Schema } from 'effect';
import { SolarSystem } from './solar_system';
import { Connection } from './connection';
import { Nebula } from './nebula';
import { FallenEmpireZone } from './fallen_empire_zone';

class SetCanvasAction extends Schema.TaggedClass<SetCanvasAction>()(
	'SetCanvasAction',
	{
		old_value: Schema.instanceOf(Blob),
		new_value: Schema.instanceOf(Blob),
	},
) {
	invert(): SetCanvasAction {
		return SetCanvasAction.make({
			old_value: this.new_value,
			new_value: this.old_value,
		});
	}
}

export class CreateSolarSystemAction extends Schema.TaggedClass<CreateSolarSystemAction>()(
	'CreateSolarSystemAction',
	{
		solar_system: SolarSystem,
	},
) {
	invert(): DeleteSolarSystemAction {
		return DeleteSolarSystemAction.make({
			solar_system: this.solar_system,
		});
	}
}

export class DeleteSolarSystemAction extends Schema.TaggedClass<DeleteSolarSystemAction>()(
	'DeleteSolarSystemAction',
	{
		solar_system: SolarSystem,
	},
) {
	invert(): CreateSolarSystemAction {
		return CreateSolarSystemAction.make({
			solar_system: this.solar_system,
		});
	}
}

export class UpdateSolarSystemAction extends Schema.TaggedClass<UpdateSolarSystemAction>()(
	'UpdateSolarSystemAction',
	{
		old_value: SolarSystem,
		new_value: SolarSystem,
	},
) {
	invert(): UpdateSolarSystemAction {
		return UpdateSolarSystemAction.make({
			old_value: this.new_value,
			new_value: this.old_value,
		});
	}
}

export class CreateHyperlaneAction extends Schema.TaggedClass<CreateHyperlaneAction>()(
	'CreateHyperlaneAction',
	{
		connection: Connection,
	},
) {
	invert(): DeleteHyperlaneAction {
		return DeleteHyperlaneAction.make({
			connection: this.connection,
		});
	}
}

export class DeleteHyperlaneAction extends Schema.TaggedClass<DeleteHyperlaneAction>()(
	'DeleteHyperlaneAction',
	{
		connection: Connection,
	},
) {
	invert(): CreateHyperlaneAction {
		return CreateHyperlaneAction.make({
			connection: this.connection,
		});
	}
}

class CreateWormholeAction extends Schema.TaggedClass<CreateWormholeAction>()(
	'CreateWormholeAction',
	{
		connection: Connection,
	},
) {
	invert(): DeleteWormholeAction {
		return DeleteWormholeAction.make({
			connection: this.connection,
		});
	}
}

class DeleteWormholeAction extends Schema.TaggedClass<DeleteWormholeAction>()(
	'DeleteWormholeAction',
	{
		connection: Connection,
	},
) {
	invert(): CreateWormholeAction {
		return CreateWormholeAction.make({
			connection: this.connection,
		});
	}
}

class CreateNebulaAction extends Schema.TaggedClass<CreateNebulaAction>()(
	'CreateNebulaAction',
	{
		nebula: Nebula,
	},
) {
	invert(): DeleteNebulaAction {
		return DeleteNebulaAction.make({
			nebula: this.nebula,
		});
	}
}

class DeleteNebulaAction extends Schema.TaggedClass<DeleteNebulaAction>()(
	'DeleteNebulaAction',
	{
		nebula: Nebula,
	},
) {
	invert(): CreateNebulaAction {
		return CreateNebulaAction.make({
			nebula: this.nebula,
		});
	}
}

export class UpdateNebulaAction extends Schema.TaggedClass<UpdateNebulaAction>()(
	'UpdateNebulaAction',
	{
		old_value: Nebula,
		new_value: Nebula,
	},
) {
	invert(): UpdateNebulaAction {
		return UpdateNebulaAction.make({
			old_value: this.new_value,
			new_value: this.old_value,
		});
	}
}

export class CreateFallenEmpireZoneAction extends Schema.TaggedClass<CreateFallenEmpireZoneAction>()(
	'CreateFallenEmpireZoneAction',
	{
		zone: FallenEmpireZone,
	},
) {
	invert(): DeleteFallenEmpireZoneAction {
		return DeleteFallenEmpireZoneAction.make({
			zone: this.zone,
		});
	}
}

export class DeleteFallenEmpireZoneAction extends Schema.TaggedClass<DeleteFallenEmpireZoneAction>()(
	'DeleteFallenEmpireZoneAction',
	{
		zone: FallenEmpireZone,
	},
) {
	invert(): CreateFallenEmpireZoneAction {
		return CreateFallenEmpireZoneAction.make({
			zone: this.zone,
		});
	}
}

export class UpdateFallenEmpireZoneAction extends Schema.TaggedClass<UpdateFallenEmpireZoneAction>()(
	'UpdateFallenEmpireZoneAction',
	{
		old_value: FallenEmpireZone,
		new_value: FallenEmpireZone,
	},
) {
	invert(): UpdateFallenEmpireZoneAction {
		return UpdateFallenEmpireZoneAction.make({
			old_value: this.new_value,
			new_value: this.old_value,
		});
	}
}

export const Action = Object.assign(
	Schema.Union(
		SetCanvasAction,
		CreateSolarSystemAction,
		DeleteSolarSystemAction,
		UpdateSolarSystemAction,
		CreateHyperlaneAction,
		DeleteHyperlaneAction,
		CreateWormholeAction,
		DeleteWormholeAction,
		CreateNebulaAction,
		DeleteNebulaAction,
		UpdateNebulaAction,
		CreateFallenEmpireZoneAction,
		DeleteFallenEmpireZoneAction,
		UpdateFallenEmpireZoneAction,
	),
	{
		SetCanvasAction,
		CreateSolarSystemAction,
		DeleteSolarSystemAction,
		UpdateSolarSystemAction,
		CreateHyperlaneAction,
		DeleteHyperlaneAction,
		CreateWormholeAction,
		DeleteWormholeAction,
		CreateNebulaAction,
		DeleteNebulaAction,
		UpdateNebulaAction,
		CreateFallenEmpireZoneAction,
		DeleteFallenEmpireZoneAction,
		UpdateFallenEmpireZoneAction,
	},
);

export type Action =
	| SetCanvasAction
	| CreateSolarSystemAction
	| DeleteSolarSystemAction
	| UpdateSolarSystemAction
	| CreateHyperlaneAction
	| DeleteHyperlaneAction
	| CreateWormholeAction
	| DeleteWormholeAction
	| CreateNebulaAction
	| DeleteNebulaAction
	| UpdateNebulaAction
	| CreateFallenEmpireZoneAction
	| DeleteFallenEmpireZoneAction
	| UpdateFallenEmpireZoneAction;
