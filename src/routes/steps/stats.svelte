<script lang="ts">
	import Info from '$lib/components/info.svelte';
	import SectionHeader from '$lib/components/section_header.svelte';
	import {
		initializer_metadata,
		type InitializerKey,
	} from '$lib/data/initializer_metadata';
	import { get_editor } from '$lib/editor.svelte';
	import type { SolarSystem, SolarSystemId } from '$lib/models/solar_system';
	import { Array, Iterable, Option, Order, pipe, Record } from 'effect';

	const editor = get_editor();

	const solar_systems = $derived(editor().project.solar_systems);
	const num_solar_systems = $derived(solar_systems.length);
	const num_spawns = $derived(
		solar_systems.filter(
			(solar_system) => solar_system.spawn_type !== 'disabled',
		).length,
	);
	const num_safe_ai_spawns = $derived(
		solar_systems.filter(
			(solar_system) =>
				solar_system.spawn_type === 'enabled' ||
				solar_system.spawn_type === 'preferred',
		).length - 1,
	);
	const systems_by_initializer = $derived(
		pipe(
			solar_systems,
			Iterable.groupBy((solar_system) =>
				Option.getOrElse(solar_system.get_initializer(), () => ''),
			),
		),
	);
	const required_dlc_system_ids = $derived(
		pipe(
			systems_by_initializer,
			Record.toEntries,
			Iterable.flatMap<[string, SolarSystem[]], SolarSystem>(
				([initializer, systems]) => {
					const dlc = initializer_metadata[initializer as InitializerKey]?.dlc;
					if (dlc != null && dlc.length > 0) return systems;
					return [];
				},
			),
			Iterable.map((solar_system) => solar_system.id),
			Array.fromIterable,
		),
	);
	const required_dlc = $derived(
		pipe(
			systems_by_initializer,
			Record.keys,
			Iterable.filterMap((initializer) =>
				Option.fromNullable(
					initializer_metadata[initializer as InitializerKey]?.dlc,
				),
			),
			Iterable.filter(Array.isNonEmptyArray),
			Array.sortWith((array) => array.length, Order.number),
			Array.reduce(new Set<string>(), (acc, cur) => {
				if (cur.length === 1) {
					acc.add(cur[0]);
				} else if (cur.some((dlc) => acc.has(dlc))) {
					// do nothing
					// one of the potential DLCs is already specifically required
				} else {
					acc.add(cur.toSorted().join(' OR '));
				}
				return acc;
			}),
		),
	);
	const duplicate_unique_systems = $derived(
		pipe(
			systems_by_initializer,
			Record.filter((value, key) => {
				const is_unique = Boolean(
					key in initializer_metadata &&
					initializer_metadata[key as InitializerKey]?.unique,
				);
				return is_unique && value.length > 1;
			}),
		),
	);
	const num_duplicate_unique_systems = $derived(
		pipe(
			duplicate_unique_systems,
			Record.reduce(0, (acc, cur) => acc + cur.length),
		),
	);
	const duplicate_name_systems = $derived(
		pipe(
			solar_systems,
			Iterable.groupBy((solar_system) =>
				Option.getOrElse(solar_system.get_name(), () => ''),
			),
			Record.filter((value, key) => key !== '' && value.length > 1),
		),
	);
	const num_duplicate_name_systems = $derived(
		pipe(
			duplicate_name_systems,
			Record.reduce(0, (acc, cur) => acc + cur.length),
		),
	);
	const missing_marauder_1 = $derived(
		check_for_missing_associated_systems(
			['marauder_1_1', 'marauder_1_2', 'marauder_1_3'],
			systems_by_initializer,
		),
	);
	const missing_marauder_2 = $derived(
		check_for_missing_associated_systems(
			['marauder_2_1', 'marauder_2_2', 'marauder_2_3'],
			systems_by_initializer,
		),
	);
	const missing_marauder_3 = $derived(
		check_for_missing_associated_systems(
			['marauder_3_1', 'marauder_3_2', 'marauder_3_3'],
			systems_by_initializer,
		),
	);
	const missing_ratling = $derived(
		check_for_missing_associated_systems(
			['ratling_1_1', 'ratling_1_2', 'ratling_1_3'],
			systems_by_initializer,
		),
	);

	type MissingSystemsWarning = {
		has_initializers: InitializerKey[];
		missing_initializers: InitializerKey[];
		system_ids: SolarSystemId[];
	};
	function check_for_missing_associated_systems(
		initializers: InitializerKey[],
		systems_by_initializer: Record<string, SolarSystem[]>,
	): Option.Option<MissingSystemsWarning> {
		const has_initializers = initializers.filter(
			(initializer) => initializer in systems_by_initializer,
		);
		const missing_initializers = initializers.filter(
			(initializer) => !(initializer in systems_by_initializer),
		);
		if (has_initializers.length > 0 && missing_initializers.length > 0) {
			return Option.some({
				has_initializers,
				missing_initializers,
				system_ids: pipe(
					has_initializers,
					Iterable.flatMap(
						(initializer) => systems_by_initializer[initializer] ?? [],
					),
					Iterable.map<SolarSystem, SolarSystemId>(
						(solar_system) => solar_system.id,
					),
					Array.fromIterable,
				),
			});
		} else {
			return Option.none();
		}
	}

	const WARNING_STYLE = 'preset-filled-warning-500';
</script>

{#snippet missing_systems_warning(
	warning: Option.Option<MissingSystemsWarning>,
	label: string,
)}
	{#if Option.isSome(warning)}
		<!-- svelte-ignore a11y_mouse_events_have_key_events -->
		<tr
			class={WARNING_STYLE}
			onmouseover={() =>
				(editor().warned_solar_system_ids = warning.value.system_ids)}
			onmouseout={() => (editor().warned_solar_system_ids = [])}
		>
			<td class="align-top">
				{label}
				<Info class="text-warning-50-950 relative top-0.5">
					Some unique systems require others to be present.
				</Info>
			</td>
			<td class="text-end">
				{#each warning.value.missing_initializers as initializer (initializer)}
					<div>{initializer}</div>
				{/each}
			</td>
		</tr>
	{/if}
{/snippet}

<SectionHeader>Stats</SectionHeader>
<div class="table-wrap">
	<table class="table">
		<tbody>
			<tr class={{ [WARNING_STYLE]: num_solar_systems === 0 }}>
				<td>Solar Systems</td>
				<td class="text-end">{num_solar_systems}</td>
			</tr>
			<tr class={{ [WARNING_STYLE]: num_spawns === 0 }}>
				<td>Spawns</td>
				<td class="text-end">{num_spawns}</td>
			</tr>
			<tr>
				<td>
					Max Safe AI Empires
					<Info class="text-secondary-800-200 relative top-0.5">
						You should not set the AI Empires slider higher than this, with 2
						exceptions:
						<ul class="list-disc ms-4">
							<li>
								Increase by 1 for for each force-spawned custom design with a
								Reserved spawn.
							</li>
							<li>
								Decrease by 1 for each player beyond the first (unless using a
								Reserved spawn).
							</li>
						</ul>
					</Info>
				</td>
				<td class="text-end">{num_safe_ai_spawns}</td>
			</tr>
			{#if required_dlc.size > 0}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<tr
					onmouseover={() =>
						(editor().warned_solar_system_ids = required_dlc_system_ids)}
					onmouseout={() => (editor().warned_solar_system_ids = [])}
				>
					<td class="align-top">
						Required DLC
						<Info class="text-secondary-800-200 relative top-0.5">
							These DLC are required by the system initializers you've set.
							These systems will spawn whether you own this DLC or not, which
							could cause bugs if you do not.
						</Info>
					</td>
					<td class="text-end">
						{#each required_dlc as dlc (dlc)}
							<div>{dlc}</div>
						{/each}
					</td>
				</tr>
			{/if}
			{#if num_duplicate_unique_systems > 0}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<tr
					class={WARNING_STYLE}
					onmouseover={() =>
						(editor().warned_solar_system_ids = pipe(
							duplicate_unique_systems,
							Record.values,
							Array.flatMap((systems) => systems.map((system) => system.id)),
						))}
					onmouseout={() => (editor().warned_solar_system_ids = [])}
				>
					<td>
						Duplicate Unique Systems
						<Info class="text-warning-50-950 relative top-0.5">
							Multiple systems are set to the same unique system initializer.
							This can cause bugs with event chains.
						</Info>
					</td>
					<td class="text-end">{num_duplicate_unique_systems}</td>
				</tr>
			{/if}
			{#if num_duplicate_name_systems > 0}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<tr
					class={WARNING_STYLE}
					onmouseover={() =>
						(editor().warned_solar_system_ids = pipe(
							duplicate_name_systems,
							Record.values,
							Array.flatMap((systems) => systems.map((system) => system.id)),
						))}
					onmouseout={() => (editor().warned_solar_system_ids = [])}
				>
					<td>
						Duplicate Names
						<Info class="text-warning-50-950 relative top-0.5">
							Multiple systems share the same name. This won't cause any bugs,
							but can be confusing and immersion-breaking.
						</Info>
					</td>
					<td class="text-end">{num_duplicate_name_systems}</td>
				</tr>
			{/if}
			{@render missing_systems_warning(
				missing_marauder_1,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_marauder_2,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_marauder_3,
				'Missing Marauder Systems',
			)}
			{@render missing_systems_warning(
				missing_ratling,
				'Missing Ketling Systems',
			)}
		</tbody>
	</table>
</div>
