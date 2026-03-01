<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icons } from './icons';

	type Props = {
		id: string;
		title: string;
		children: Snippet;
	};
	const { id, title, children }: Props = $props();

	let dialog: HTMLDialogElement;

	export function close() {
		dialog.close();
	}
</script>

<dialog
	{id}
	class="card bg-surface-100-900 w-full max-w-md p-4 space-y-4 shadow-xl mx-auto mt-12 backdrop:backdrop-blur-sm"
	bind:this={dialog}
>
	<header class="flex justify-between items-center">
		<h2 class="text-lg font-bold">{title}</h2>
		<button
			type="button"
			command="close"
			commandfor={id}
			class="btn-icon hover:preset-tonal"
		>
			<Icons.X class="size-4" />
		</button>
	</header>
	{@render children?.()}
</dialog>
