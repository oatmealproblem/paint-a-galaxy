import { Schema } from 'effect';
import { SolarSystem } from './solar_system';
import { Connection } from './connection';
import { Nebula } from './nebula';

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

class CreateSolarSystemAction extends Schema.TaggedClass<CreateSolarSystemAction>()(
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

class DeleteSolarSystemAction extends Schema.TaggedClass<DeleteSolarSystemAction>()(
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

class UpdateSolarSystemAction extends Schema.TaggedClass<UpdateSolarSystemAction>()(
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

class CreateHyperlaneAction extends Schema.TaggedClass<CreateHyperlaneAction>()(
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

class DeleteHyperlaneAction extends Schema.TaggedClass<DeleteHyperlaneAction>()(
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
	| DeleteNebulaAction;
