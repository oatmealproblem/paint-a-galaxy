<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import { ID } from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { GridConfig } from '$lib/models/grid_config';
	import { Project } from '$lib/models/project';
	import type { EventHandler } from 'svelte/elements';

	const editor = get_editor();
	const id = ID.configure_grid_dialog;
	let is_duplicate_name = $state(false);
	let dialog: Dialog;

	let type: string = $state(editor().project.grid_config.type);
	let size: number = $state(editor().project.grid_config.size);
	let rotate: number = $state(editor().project.grid_config.rotate);
	let x_offset: number = $state(-editor().project.grid_config.x_offset); // present in Stellaris coordinate system, save in canvas coordinate system
	let y_offset: number = $state(editor().project.grid_config.y_offset);

	const onsubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
		e.preventDefault();

		const grid_config = new GridConfig({
			...editor().project.grid_config,
			type: type as GridConfig['type'],
			size,
			rotate,
			x_offset: -x_offset, // present in Stellaris coordinate system, save in canvas coordinate system
			y_offset,
		});

		editor().project = new Project({
			...editor().project,
			grid_config,
		});

		dialog.close();
	};
</script>

<Dialog {id} title="Configure Grid" bind:this={dialog}>
	<form class="flex flex-col gap-4" {onsubmit}>
		<label>
			<span class="label-text">Type</span>
			<select class="select bg-surface-200-800" bind:value={type}>
				<option value="square">Square</option>
				<option value="triangle">Triangle</option>
				<option value="hex">Hex</option>
				<option value="radial-4">Radial (4 spokes)</option>
				<option value="radial-6">Radial (6 spokes)</option>
			</select>
		</label>
		<label>
			<span class="label-text">Size</span>
			<input
				class="input bg-surface-200-800"
				type="number"
				bind:value={size}
				onblur={() => {
					if (size <= 0) size = 1;
				}}
				step="any"
			/>
		</label>
		<label>
			<span class="label-text">Rotation (degrees)</span>
			<input
				class="input bg-surface-200-800"
				type="number"
				bind:value={rotate}
				onblur={() => {
					rotate = rotate % 360;
				}}
				step="any"
			/>
		</label>
		<label>
			<span class="label-text">X Offset</span>
			<input
				class="input bg-surface-200-800"
				type="number"
				bind:value={x_offset}
				onblur={() => {
					if (x_offset > 500) x_offset = 500;
					if (x_offset < -500) x_offset = -500;
				}}
				step="any"
			/>
		</label>
		<label>
			<span class="label-text">Y Offset</span>
			<input
				class="input bg-surface-200-800"
				type="number"
				bind:value={y_offset}
				onblur={() => {
					if (y_offset > 500) y_offset = 500;
					if (y_offset < -500) y_offset = -500;
				}}
				step="any"
			/>
		</label>
		<div class="flex justify-end gap-2">
			<button
				class="btn preset-outlined-primary-500 w-auto"
				type="button"
				command="close"
				commandfor={id}
			>
				Cancel
			</button>
			<button
				class="btn preset-filled-primary-500 w-auto"
				type="submit"
				disabled={is_duplicate_name}
			>
				Save
			</button>
		</div>
	</form>
</Dialog>
