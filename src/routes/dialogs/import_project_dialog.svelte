<script lang="ts">
	import Dialog from '$lib/components/dialog.svelte';
	import { Icons } from '$lib/components/icons';
	import { CUSTOM_COMMAND, ID } from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { Project } from '$lib/models/project';
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { EventHandler } from 'svelte/elements';

	const editor = get_editor();
	const id = ID.import_project_dialog;
	let dialog: Dialog;
	let name = $state('');
	const is_duplicate_name = $derived(
		editor().projects.some((project) => project.name === clean_name(name)),
	);
	let files = $state<File[]>([]);
	let parse_failed = $state(false);

	function clean_name(name: string) {
		return name.trim().replaceAll(/\s+/g, ' ');
	}

	const onsubmit: EventHandler<SubmitEvent, HTMLFormElement> = async (e) => {
		e.preventDefault();

		const trimmed = clean_name(name);
		if (trimmed.length === 0) return;
		if (editor().projects.some((project) => project.name === trimmed)) return;

		const file = files[0];
		if (file) {
			const text = await file.text();
			try {
				const defaults =
					file.name.endsWith('.json') ?
						await Project.from_json(JSON.parse(text))
					:	await Project.from_txt(text);
				editor().create_project(trimmed, defaults);
				// reset camera
				const event = new Event('command') as Event & { command: string };
				event.command = CUSTOM_COMMAND.reset_zoom;
				document.getElementById(ID.canvas)?.dispatchEvent(event);

				dialog.close();
			} catch (e) {
				console.error(e);
				parse_failed = true;
				return;
			}
		} else {
			return;
		}
	};
</script>

<Dialog
	{id}
	title="New Project"
	bind:this={dialog}
	on_open={() => {
		files = [];
		name = '';
		parse_failed = false;
	}}
>
	<form class="flex flex-col gap-4" {onsubmit}>
		<FileUpload
			accept=".txt,.json"
			maxFiles={1}
			acceptedFiles={files}
			onFileChange={(details) => {
				files = details.acceptedFiles;
			}}
		>
			<FileUpload.Dropzone
				class="bg-surface-200-800 border border-surface-500 border-dashed"
			>
				<Icons.FileText class="size-10" />
				<span>Select JSON or txt file, or drag here.</span>
				<FileUpload.Trigger>Browse Files</FileUpload.Trigger>
				<FileUpload.HiddenInput />
			</FileUpload.Dropzone>
			<FileUpload.ItemGroup>
				<FileUpload.Context>
					{#snippet children(fileUpload)}
						{#each fileUpload().acceptedFiles as file (file.name)}
							<FileUpload.Item
								{file}
								class=" border border-surface-500 bg-surface-200-800"
							>
								<FileUpload.ItemName>{file.name}</FileUpload.ItemName>
								<FileUpload.ItemSizeText>
									{file.size} bytes
								</FileUpload.ItemSizeText>
								<FileUpload.ItemDeleteTrigger />
							</FileUpload.Item>
						{/each}
					{/snippet}
				</FileUpload.Context>
			</FileUpload.ItemGroup>
		</FileUpload>
		{#if parse_failed}
			<small class="text-warning-500">Failed to parse uploaded file.</small>
		{/if}
		<label>
			<span class="label-text">Name</span>
			<input
				class="input ring-surface-500 bg-surface-200-800"
				name="name"
				bind:value={name}
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
				disabled={is_duplicate_name || files[0] == null}
			>
				Import
			</button>
		</div>
	</form>
</Dialog>
