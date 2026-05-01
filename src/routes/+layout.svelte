<script lang="ts">
	import EditorProvider from '$lib/editor_provider.svelte';
	import { Editor } from '$lib/editor.svelte';
	import Header from './header.svelte';
	import './layout.css';
	import NewProjectDialog from './dialogs/new_project_dialog.svelte';
	import DeleteProjectDialog from './dialogs/delete_project_dialog.svelte';
	import RenameProjectDialog from './dialogs/rename_project_dialog.svelte';
	import UploadImageDialog from './dialogs/upload_image_dialog.svelte';
	import CloneProjectDialog from './dialogs/clone_project_dialog.svelte';
	import ConfigureGridDialog from './dialogs/configure_grid_dialog.svelte';
	import ImportProjectDialog from './dialogs/import_project_dialog.svelte';

	let { children } = $props();

	const editor_promise = Editor.load();
</script>

<svelte:head>
	<title>Paint a Galaxy</title>
</svelte:head>

<div class="w-full h-full flex flex-col overflow-hidden">
	<svelte:boundary>
		{#snippet pending()}
			<div class="text-center">Loading...</div>
		{/snippet}

		<EditorProvider editor={await editor_promise}>
			<Header />
			<NewProjectDialog />
			<DeleteProjectDialog />
			<RenameProjectDialog />
			<CloneProjectDialog />
			<ImportProjectDialog />
			<UploadImageDialog />
			<ConfigureGridDialog />
			{@render children()}
		</EditorProvider>
	</svelte:boundary>
</div>
