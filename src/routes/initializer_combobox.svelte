<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import Info from '$lib/components/info.svelte';
	import {
		initializer_metadata,
		type InitializerKey,
	} from '$lib/data/initializer_metadata';
	import { get_editor } from '$lib/editor.svelte';
	import { Action } from '$lib/models/action';
	import { SolarSystem } from '$lib/models/solar_system';
	import {
		Combobox,
		Portal,
		useListCollection,
		type ComboboxRootProps,
	} from '@skeletonlabs/skeleton-svelte';
	import {
		Array,
		Iterable,
		Option,
		Order,
		pipe,
		Predicate,
		Record,
	} from 'effect';

	type Props = {
		solar_system: SolarSystem;
	};
	const { solar_system }: Props = $props();

	const editor = get_editor();

	let input = $state('');

	const metadata = $derived(
		pipe(
			solar_system.initializer,
			Option.flatMapNullable((value) =>
				value in initializer_metadata ?
					initializer_metadata[value as InitializerKey]
				:	null,
			),
		),
	);

	const data = pipe(
		initializer_metadata,
		Record.filter(Predicate.isNotNull),
		Record.toEntries,
		Iterable.map(([key, value]) => ({
			key,
			...value,
			type: value.unique ? 'Unique' : 'Standard',
			label:
				value.name ? `${value.name} / ${value.description}` : value.description,
		})),
		Array.fromIterable,
		Array.sortBy(
			Order.mapInput(Order.boolean, (item) => item.unique),
			Order.mapInput(Order.string, (item) => item.label),
		),
	);

	let items = $state(data);

	const collection = $derived(
		useListCollection({
			items: [
				...items,
				...((
					input &&
					!(
						input in initializer_metadata &&
						initializer_metadata[input as InitializerKey] != null
					)
				) ?
					[
						{
							key: input,
							type: 'Custom',
							name: null,
							label: 'Custom Value / Modded Initializer',
							description: 'Custom Value / Modded Initializer',
							unique: false,
							dlc: [],
						},
					]
				:	[]),
			],
			itemToString: (item) => item.key,
			itemToValue: (item) => item.key,
			isItemDisabled: (item) => contains_whitespace(item.key),
			groupBy: (item) => item.type,
		}),
	);

	const on_open_change: ComboboxRootProps['onOpenChange'] = (event) => {
		if (event.reason !== 'input-change') {
			items = data;
		}
	};

	const on_input_value_change: ComboboxRootProps['onInputValueChange'] = (
		event,
	) => {
		input = event.inputValue;
		const filtered = data.filter((item) =>
			[item.key.toLowerCase(), item.label.toLowerCase()].some((text) =>
				text.includes(event.inputValue.toLowerCase()),
			),
		);
		items = filtered;
	};

	function contains_whitespace(s: string) {
		return /\s/.test(s.trim());
	}
</script>

<Combobox
	class="gap-0"
	placeholder="Search..."
	{collection}
	onOpenChange={on_open_change}
	onInputValueChange={on_input_value_change}
	inputBehavior="autohighlight"
	positioning={{ placement: 'bottom-start' }}
	value={[Option.getOrElse(solar_system.get_initializer(), () => '')]}
	disabled={solar_system.spawn_type !== 'disabled'}
	onValueChange={(details) => {
		editor().apply_actions([
			new Action.UpdateSolarSystemAction({
				old_value: solar_system,
				new_value: new SolarSystem({
					...solar_system,
					initializer: pipe(
						details.value,
						Array.get(0),
						Option.flatMapNullable((value) => (value === '' ? null : value)),
					),
				}),
			}),
		]);
	}}
>
	<Combobox.Label class="flex gap-1">
		Initializer
		<Info>
			The initializer determines the content of the solar system (planets, etc).
			You can use it to customize the location of unique/event systems.
		</Info>
	</Combobox.Label>
	<Combobox.Control>
		<Combobox.Input
			class="bg-surface-200-800 not-focus-visible:ring-surface-300-700"
		/>
		{#if Option.isSome(solar_system.get_initializer())}
			<Combobox.ClearTrigger
				class="absolute top-1.5 -translateY-0.5 rounded-base inline-flex justify-center items-center size-6 inset-e-9 p-1.5"
			>
				<Icons.X />
			</Combobox.ClearTrigger>
		{/if}
		<Combobox.Trigger />
	</Combobox.Control>
	<Portal>
		<Combobox.Positioner class="z-100! w-auto! min-w-[var(--reference-width)]">
			<Combobox.Content
				class="max-h-96 overflow-auto w-auto bg-surface-100-900"
			>
				{#each collection.group() as [type, items], index (type)}
					{#if index !== 0}
						<hr class="border-t border-surface-300-700" />
					{/if}
					<Combobox.ItemGroup class="flex flex-col gap-2">
						<Combobox.ItemGroupLabel class="text-surface-900-100 font-bold">
							{type}
						</Combobox.ItemGroupLabel>
						{#each items as item (item.key)}
							<Combobox.Item {item} class="">
								<Combobox.ItemText class="text-xs">
									<div class="font-mono">{item.key}</div>
									<div>
										{contains_whitespace(item.key) ?
											'Invalid (contains whitespace)'
										:	item.label}
									</div>
									{#if item.dlc.length > 0}
										<div class="flex gap-1">
											{#each item.dlc as dlc (dlc)}
												<span
													class="badge preset-filled-surface-300-700 text-2xs px-2 py-0.5"
												>
													{dlc}
												</span>
											{/each}
										</div>
									{/if}
								</Combobox.ItemText>
								<Combobox.ItemIndicator />
							</Combobox.Item>
						{/each}
					</Combobox.ItemGroup>
				{/each}
			</Combobox.Content>
		</Combobox.Positioner>
	</Portal>
	<div class="mt-1">
		{#if solar_system.spawn_type !== 'disabled'}
			<span class="text-surface-800-200 text-sm">
				Cannot set initializer on spawns.
			</span>
		{:else if Option.isSome(metadata)}
			{metadata.value.description}
			{#if metadata.value.dlc.length > 0}
				<div class="flex gap-1">
					{#each metadata.value.dlc as dlc (dlc)}
						<span
							class="badge preset-filled-surface-300-700 text-2xs px-2 py-0.5"
						>
							{dlc}
						</span>
					{/each}
				</div>
			{/if}
		{:else if Option.isSome(solar_system.initializer)}
			Custom Value / Modded Initializer
		{:else}
			Random
		{/if}
	</div>
</Combobox>
