<script>
	import { Icons } from '$lib/components/icons';
	import { Switch } from '@skeletonlabs/skeleton-svelte';
</script>

<Switch
	defaultChecked={document.documentElement.dataset.mode === 'light'}
	onCheckedChange={({ checked }) => {
		document.documentElement.dataset.mode = checked ? 'light' : 'dark';
		localStorage.setItem('paint-a-galaxy-mode', checked ? 'light' : 'dark');
	}}
>
	<Switch.Control class="bg-surface-50-950 data-[state=checked]:bg-primary-500">
		<Switch.Thumb>
			<Switch.Context>
				{#snippet children(switch_)}
					{#if switch_().checked}
						<Icons.Sun class="size-3" />
					{:else}
						<Icons.Moon class="size-3" />
					{/if}
				{/snippet}
			</Switch.Context>
		</Switch.Thumb>
	</Switch.Control>
	<Switch.Label class="sr-only">Light Mode</Switch.Label>
	<Switch.HiddenInput />
</Switch>
