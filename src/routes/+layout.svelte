<script lang="ts">
	import EditorProvider from '$lib/editor_provider.svelte';
	import { Editor } from '$lib/editor.svelte';
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster';
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

	function on_error(event: Event) {
		const error_event = event as ErrorEvent;
		toaster.error({
			title: 'Unexpected Error',
			description: error_event.error?.message ?? error_event.message,
		});
	}

	function on_unhandledrejection(event: PromiseRejectionEvent) {
		toaster.error({
			title: 'Unexpected Error',
			description:
				event.reason instanceof Error ?
					event.reason.message
				:	String(event.reason),
		});
	}
</script>

<svelte:head>
	<title>Paint a Galaxy</title>
</svelte:head>

<svelte:window
	onerror={on_error}
	onunhandledrejection={on_unhandledrejection}
/>

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
			<Toast.Group {toaster}>
				{#snippet children(toast)}
					<Toast {toast}>
						<Toast.Message>
							<Toast.Title>{toast.title}</Toast.Title>
							<Toast.Description>{toast.description}</Toast.Description>
						</Toast.Message>
						<Toast.CloseTrigger />
					</Toast>
				{/snippet}
			</Toast.Group>
			{@render children()}
		</EditorProvider>
	</svelte:boundary>
</div>
