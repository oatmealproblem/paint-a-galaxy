<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import { ID } from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import type { EventHandler } from 'svelte/elements';

	const editor = get_editor();
	const id = ID.rename_project_dialog;
	let name = $state('');
	const is_duplicate_name = $derived(
		editor().projects.some(
			(project) =>
				project.name !== editor().project.name &&
				project.name === clean_name(name),
		),
	);
	let dialog: Dialog;

	function clean_name(name: string) {
		return name.trim().replaceAll(/\s+/g, ' ');
	}

	const onsubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		const name = data.get('name');
		if (typeof name !== 'string') throw new Error('name is not a string');
		const trimmed = clean_name(name);
		if (trimmed.length === 0) return;
		if (
			editor().projects.some(
				(project) =>
					project.name !== editor().project.name && project.name === trimmed,
			)
		)
			return;
		editor().rename_project(trimmed);
		dialog.close();
	};
</script>

<Dialog
	{id}
	title="Rename Project"
	bind:this={dialog}
	on_open={() => {
		name = editor().project.name;
	}}
>
	<form class="flex flex-col gap-4" {onsubmit}>
		<label>
			<span class="label-text">Name</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="input ring-surface-500 bg-surface-200-800"
				name="name"
				bind:value={name}
				autofocus
				{@attach (node) => node.select()}
			/>
			{#if is_duplicate_name}
				<small class="text-warning-500">
					Name already used by another project.
				</small>
			{/if}
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
				Rename
			</button>
		</div>
	</form>
</Dialog>
