<script lang="ts">
	import type { Snippet } from 'svelte';
	import { set_editor, type Editor } from './editor.svelte';

	type Props = { editor: Editor; children: Snippet };
	const { editor, children }: Props = $props();

	set_editor(() => editor);
</script>

{@render children()}
