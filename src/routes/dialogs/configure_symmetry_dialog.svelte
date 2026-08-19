<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import { ID } from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { SymmetryConfig } from '$lib/models/symmetry_config';
	import { Project } from '$lib/models/project';
	import type { EventHandler } from 'svelte/elements';

	const editor = get_editor();
	const id = ID.configure_symmetry_dialog;
	let dialog: Dialog;

	let mode: 'bilateral' | 'radial' = $state(
		editor().project.symmetry_config.mode,
	);
	let number: number = $state(editor().project.symmetry_config.number);
	let angle: number = $state(editor().project.symmetry_config.angle);
	let x_offset: number = $state(-editor().project.symmetry_config.x_offset); // displayed as stellaris-style inverted x
	let y_offset: number = $state(editor().project.symmetry_config.y_offset);

	const onsubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
		e.preventDefault();

		const symmetry_config = new SymmetryConfig({
			...editor().project.symmetry_config,
			mode,
			number,
			angle,
			x_offset: -x_offset, // displayed as stellaris-style inverted x
			y_offset,
		});

		editor().project = new Project({
			...editor().project,
			symmetry_config,
		});

		dialog.close();
	};
</script>

<Dialog
	{id}
	title="Configure Symmetry"
	bind:this={dialog}
	on_open={() => {
		mode = editor().project.symmetry_config.mode;
		number = editor().project.symmetry_config.number;
		angle = editor().project.symmetry_config.angle;
		x_offset = -editor().project.symmetry_config.x_offset; // displayed as stellaris-style inverted x
		y_offset = editor().project.symmetry_config.y_offset;
	}}
>
	<form class="flex flex-col gap-4" {onsubmit}>
		<label>
			<span class="label-text">Mode</span>
			<select
				class="select ring-surface-500 bg-surface-200-800"
				bind:value={mode}
			>
				<option value="bilateral">Bilateral (mirror)</option>
				<option value="radial">Radial (rotate)</option>
			</select>
		</label>
		{#if mode === 'radial'}
			<label>
				<span class="label-text">Number of sectors</span>
				<input
					class="input ring-surface-500 bg-surface-200-800"
					type="number"
					bind:value={number}
					onblur={() => {
						if (!Number.isInteger(number) || number < 2) number = 2;
					}}
					step="1"
					min="2"
				/>
			</label>
		{/if}
		{#if mode === 'bilateral'}
			<label>
				<span class="label-text">Rotation (degrees)</span>
				<input
					class="input ring-surface-500 bg-surface-200-800"
					type="number"
					bind:value={angle}
					onblur={() => {
						angle = angle % 360;
						if (angle < 0) angle += 360;
					}}
					step="any"
				/>
			</label>
		{/if}
		<label>
			<span class="label-text">X Offset</span>
			<input
				class="input ring-surface-500 bg-surface-200-800"
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
				class="input ring-surface-500 bg-surface-200-800"
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
			<button class="btn preset-filled-primary-500 w-auto" type="submit">
				Save
			</button>
		</div>
	</form>
</Dialog>
