<script lang="ts">
	import { normalize_image } from '$lib/canvas';
	import Dialog from '$lib/components/dialog.svelte';
	import { Icons } from '$lib/components/icons';
	import { ID } from '$lib/constants';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { EventHandler } from 'svelte/elements';

	const editor = get_editor();
	const id = ID.upload_image_dialog;
	let dialog: Dialog;
	let files = $state<File[]>([]);

	const onsubmit: EventHandler<SubmitEvent, HTMLFormElement> = async (e) => {
		e.preventDefault();
		if (files.length !== 1) return;
		const file = files[0];
		if (!file) return;
		editor().apply_actions([
			Action.SetCanvasAction.make({
				old_value: editor().project.canvas,
				new_value: await normalize_image(file),
			}),
		]);
		dialog.close();
	};
</script>

<Dialog {id} title="Upload Image" bind:this={dialog}>
	<form class="flex flex-col gap-4" {onsubmit}>
		<FileUpload
			accept="image/*"
			maxFiles={1}
			acceptedFiles={files}
			onFileChange={(details) => {
				files = details.acceptedFiles;
			}}
		>
			<FileUpload.Dropzone>
				<Icons.FileImage class="size-10" />
				<span>Select image or drag here.</span>
				<FileUpload.Trigger>Browse Files</FileUpload.Trigger>
				<FileUpload.HiddenInput />
			</FileUpload.Dropzone>
			<FileUpload.ItemGroup>
				<FileUpload.Context>
					{#snippet children(fileUpload)}
						{#each fileUpload().acceptedFiles as file (file.name)}
							<FileUpload.Item {file}>
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
				disabled={files.length !== 1}
			>
				Confirm
			</button>
		</div>
	</form>
</Dialog>
