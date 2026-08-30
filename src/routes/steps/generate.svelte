<script lang="ts">
	import { Icons } from '$lib/components/icons';
	import Info from '$lib/components/info.svelte';
	import RangeSlider from '$lib/components/range_slider.svelte';
	import SectionHeader from '$lib/components/section_header.svelte';
	import Slider from '$lib/components/slider.svelte';
	import { get_editor } from '$lib/editor.svelte';
	import { GeneratorSettings } from '$lib/models/generator_settings';
	import { Menu, Portal, Switch } from '@skeletonlabs/skeleton-svelte';

	const editor = get_editor();
	const settings = $derived(editor().project.generator_settings);

	let free_inputs: Partial<Record<keyof typeof settings, HTMLInputElement>> =
		$state({});

	function on_generate_option_selected({ value }: { value: string }) {
		if (value === 'reset') {
			editor().update_generator_settings(GeneratorSettings.default());
			for (const key of Object.keys(
				free_inputs,
			) as (keyof typeof free_inputs)[]) {
				free_inputs[key]!.value = settings[key].toString();
			}
		} else {
			editor().generate({
				solar_systems: value === 'all' || value === 'solar_systems',
				hyperlanes: value === 'all' || value === 'hyperlanes',
				spawns: value === 'all' || value === 'spawns',
				nebulas: value === 'all' || value === 'nebulas',
			});
		}
	}
</script>

<form class="flex flex-col gap-4">
	<div class="field-group grid-cols-[auto_2.5rem] gap-px">
		<button
			class="btn ps-14 preset-filled-primary-500"
			onclick={() => on_generate_option_selected({ value: 'all' })}
		>
			Generate
		</button>
		<Menu
			positioning={{ placement: 'bottom-end' }}
			onSelect={on_generate_option_selected}
		>
			<Menu.Trigger class="btn px-0 preset-filled-primary-500">
				<Icons.ChevronDown />
			</Menu.Trigger>
			<Portal>
				<Menu.Positioner>
					<Menu.Content class="bg-surface-100-900 border-surface-300-700">
						<Menu.Item value="all">
							<Menu.ItemText>Generate All</Menu.ItemText>
						</Menu.Item>
						<Menu.Item value="solar_systems">
							<Menu.ItemText>
								Systems Only
								<small class="block">(removes hyperlanes and spawns)</small>
							</Menu.ItemText>
						</Menu.Item>
						<Menu.Item value="hyperlanes">
							<Menu.ItemText>
								Hyperlanes Only
								<small class="block">(re-generating spawns recommended)</small>
							</Menu.ItemText>
						</Menu.Item>
						<Menu.Item value="spawns">
							<Menu.ItemText>Spawns Only</Menu.ItemText>
						</Menu.Item>
						<Menu.Item value="nebulas">
							<Menu.ItemText>Nebulas Only</Menu.ItemText>
						</Menu.Item>
						<Menu.Separator class="border-surface-300-700" />
						<Menu.Item value="reset">
							<Menu.ItemText>Reset Settings</Menu.ItemText>
						</Menu.Item>
					</Menu.Content>
				</Menu.Positioner>
			</Portal>
		</Menu>
	</div>
	<SectionHeader>Solar Systems</SectionHeader>
	<label class="label">
		<span class="label-text flex gap-1">
			Number of Systems
			<Info>
				Target number of solar systems. There might not be enough room for all
				them depending other settings.
			</Info>
		</span>
		<input
			bind:this={free_inputs.number_of_systems}
			class="input ring-surface-300-700 bg-surface-100-900"
			type="number"
			min={0}
			step={1}
			defaultValue={settings.number_of_systems}
			onchange={(e) => {
				const value = e.currentTarget.valueAsNumber;
				if (!Number.isNaN(value) && value >= 0) {
					editor().update_generator_settings({
						number_of_systems: value,
					});
				}
			}}
			onblur={(e) => {
				e.currentTarget.value = settings.number_of_systems.toString();
			}}
		/>
	</label>
	<Slider
		min={0}
		max={20}
		step={1}
		value={settings.min_distance_between_systems}
		on_value_change={(value) =>
			editor().update_generator_settings({
				min_distance_between_systems: value,
			})}
	>
		{#snippet label()}
			Min Distance
			<Info>
				Minimum distance between solar systems. Decrease for denser galaxies,
				increase for looser.
			</Info>
		{/snippet}
	</Slider>
	<SectionHeader>Hyperlanes</SectionHeader>
	<Slider
		min={1}
		max={50}
		step={1}
		value={settings.max_cluster_size}
		on_value_change={(value) =>
			editor().update_generator_settings({ max_cluster_size: value })}
	>
		{#snippet label()}
			Max Cluster Size
			<Info>
				Maximum number of solar systems per cluster. Systems within a cluster
				will be more densely connected than systems in different clusters. Set
				to 0 to disable clustering.
			</Info>
		{/snippet}
	</Slider>
	<Slider
		min={0}
		max={1}
		step={0.01}
		value={settings.hyperlane_connectivity}
		on_value_change={(value) =>
			editor().update_generator_settings({ hyperlane_connectivity: value })}
	>
		{#snippet label()}
			Same-Cluster Connectivity
			<Info>
				Likelihood of hyperlane connections between systems in the same cluster.
				At 0%, systems will be minimally connected but still reachable.
			</Info>
		{/snippet}
		{#snippet output(value)}{Math.round(value * 100)}%{/snippet}
	</Slider>
	<Slider
		min={0}
		max={1}
		step={0.01}
		value={settings.inter_cluster_connectivity}
		on_value_change={(value) =>
			editor().update_generator_settings({ inter_cluster_connectivity: value })}
	>
		{#snippet label()}
			Cross-Cluster Connectivity
			<Info>
				Likelihood for 2 neighboring clusters to have a hyperlane connection. At
				0%, clusters will be minimally connected but still reachable.
			</Info>
		{/snippet}
		{#snippet output(value)}{Math.round(value * 100)}%{/snippet}
	</Slider>
	<Slider
		min={0}
		max={500}
		step={1}
		value={settings.hyperlane_max_distance}
		on_value_change={(value) =>
			editor().update_generator_settings({ hyperlane_max_distance: value })}
	>
		{#snippet label()}
			Max Distance
			<Info>
				Maximum hyperlane distance. Hyperlanes longer than this are removed,
				unless they are necessary to keep all systems connected.
			</Info>
		{/snippet}
	</Slider>
	<Switch
		checked={settings.allow_disconnected}
		onCheckedChange={(details) =>
			editor().update_generator_settings({
				allow_disconnected: details.checked,
			})}
	>
		<Switch.Control>
			<Switch.Thumb />
		</Switch.Control>
		<Switch.Label class="flex gap-1">
			Allow Disconnected
			<Info>
				If enabled, hyperlanes longer than Max Distance are removed even if it
				would result in disconnected systems.
			</Info>
		</Switch.Label>
		<Switch.HiddenInput />
	</Switch>
	<SectionHeader>Spawns</SectionHeader>
	<label class="label">
		<span class="label-text flex gap-1">
			Spawns per 100 Systems
			<Info>
				Target number of potential empire home systems, per 100 solar systems.
			</Info>
		</span>
		<input
			bind:this={free_inputs.spawns_per_100_solar_systems}
			class="input ring-surface-300-700 bg-surface-100-900"
			type="number"
			min={0}
			step={1}
			defaultValue={settings.spawns_per_100_solar_systems}
			onchange={(e) => {
				const value = e.currentTarget.valueAsNumber;
				if (!Number.isNaN(value) && value >= 0) {
					editor().update_generator_settings({
						spawns_per_100_solar_systems: value,
					});
				}
			}}
			onblur={(e) => {
				e.currentTarget.value =
					settings.spawns_per_100_solar_systems.toString();
			}}
		/>
		<small>
			{Math.round(
				(settings.number_of_systems * settings.spawns_per_100_solar_systems) /
					100,
			)} total spawns
		</small>
	</label>
	<SectionHeader>Nebulas</SectionHeader>
	<label class="label">
		<span class="label-text flex gap-1">
			Number of Nebulas
			<Info>Target number of nebulas to generate.</Info>
		</span>
		<input
			bind:this={free_inputs.number_of_nebulas}
			class="input ring-surface-300-700 bg-surface-100-900"
			type="number"
			min={0}
			step={1}
			defaultValue={settings.number_of_nebulas}
			onchange={(e) => {
				const value = e.currentTarget.valueAsNumber;
				if (!Number.isNaN(value) && value >= 0) {
					editor().update_generator_settings({
						number_of_nebulas: value,
					});
				}
			}}
			onblur={(e) => {
				e.currentTarget.value = settings.number_of_nebulas.toString();
			}}
		/>
	</label>
	<RangeSlider
		min={0}
		max={100}
		step={1}
		value={[settings.nebula_min_size, settings.nebula_max_size]}
		on_value_change={([nebula_min_size, nebula_max_size]) =>
			editor().update_generator_settings({
				nebula_min_size,
				nebula_max_size,
			})}
	>
		{#snippet label()}
			Nebula Size
			<Info>
				Radius of generated nebulas. Each nebula will use a random value in the
				specified range.
			</Info>
		{/snippet}
	</RangeSlider>
</form>
