<script lang="ts">
	import { Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { get_editor } from '$lib/editor.svelte';
	import { Match } from 'effect';
	import { CUSTOM_COMMAND, ID } from '$lib/constants';
	import { make_blank_image } from '$lib/canvas';
	import { Action } from '$lib/models/action';
	import { Project } from '$lib/models/project';
	import { GridConfig } from '$lib/models/grid_config';

	type RecordUnknown = Record<string, unknown>;
	type Command =
		| 'show-modal'
		| 'close'
		| 'request-close'
		| 'show-popover'
		| 'hide-popover'
		| 'toggle-popover'
		| (typeof CUSTOM_COMMAND)[keyof typeof CUSTOM_COMMAND];

	const editor = get_editor();

	function on_edit_menu_select(details: { value: string }) {
		Match.value(details.value).pipe(
			Match.when('undo', () => editor().undo()),
			Match.when('redo', () => editor().redo()),
			Match.when('clear', async () =>
				editor().apply_actions([
					Action.SetCanvasAction.make({
						old_value: editor().project.canvas,
						new_value: await make_blank_image(),
					}),
				]),
			),
		);
	}

	function onkeydown(e: KeyboardEvent) {
		const active_element = document.activeElement;
		const is_editing_text =
			active_element != null &&
			'selectionStart' in active_element &&
			active_element.selectionStart != null;
		if (is_editing_text) return;
		// TODO better support for non-Latin keyboards
		// TODO support metaKey instead of ctrlKey based on navigator.platform
		if (e.key === 'z' && e.ctrlKey && editor().can_undo) editor().undo();
		if (e.key === 'я' && e.ctrlKey && editor().can_undo) editor().undo();
		if (e.key === 'Z' && e.ctrlKey && editor().can_redo) editor().redo();
		if (e.key === 'Я' && e.ctrlKey && editor().can_redo) editor().redo();
		if (e.key === 'y' && e.ctrlKey && editor().can_redo) editor().redo();
		if (e.key === 'н' && e.ctrlKey && editor().can_redo) editor().redo();
	}
</script>

<svelte:window {onkeydown} />

{#snippet menu_item_command(
	value: string,
	text: string,
	command: Command,
	commandfor: (typeof ID)[keyof typeof ID],
)}
	<Menu.Item {value} class="w-full">
		{#snippet element(attributes: RecordUnknown)}
			<button {...attributes} {command} {commandfor}>
				<Menu.ItemText>{text}</Menu.ItemText>
			</button>
		{/snippet}
	</Menu.Item>
{/snippet}

{#snippet menu_item_link(value: string, text: string, url: string)}
	<Menu.Item {value}>
		{#snippet element(attributes: RecordUnknown)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={url} {...attributes}>
				<Menu.ItemText>{text}</Menu.ItemText>
			</a>
		{/snippet}
	</Menu.Item>
{/snippet}

{#snippet menu_item_canvas_opacity(value: number)}
	<Menu.OptionItem
		type="radio"
		value="canvas-opacity-{value}"
		checked={editor().current_step_canvas_opacity === value}
		onCheckedChange={(checked) => {
			if (checked) {
				const setting = `canvas_opacity_${editor().step}_step` as const;
				editor().update_view_settings({ [setting]: value });
			}
		}}
	>
		<Menu.ItemText>{value * 100}%</Menu.ItemText>
		<Menu.ItemIndicator class="hidden data-[state=checked]:block ms-2">
			<CheckIcon class="size-4" />
		</Menu.ItemIndicator>
	</Menu.OptionItem>
{/snippet}

<header class="bg-surface-200-800 flex">
	<Menu>
		<Menu.Trigger class="btn">Project</Menu.Trigger>
		<Portal>
			<Menu.Positioner class="z-10!">
				<Menu.Content class="bg-surface-100-900 border-surface-300-700">
					{@render menu_item_command(
						'new',
						'New...',
						'show-modal',
						ID.new_project_dialog,
					)}
					<Menu
						onSelect={(details) => {
							const listing = editor().projects.find(
								(listing) => listing.name === details.value,
							);
							if (!listing)
								throw new Error('menu selection is missing in projects');
							editor().open_project(listing);
						}}
						positioning={{ offset: { mainAxis: 8, crossAxis: -8 } }}
					>
						<Menu.TriggerItem value="open">
							<Menu.ItemText>Open</Menu.ItemText>
							<Menu.ItemIndicator>
								<ChevronRightIcon class="size-4" />
							</Menu.ItemIndicator>
							<Portal>
								<Menu.Positioner class="z-10!">
									<Menu.Content
										class="bg-surface-100-900 border-surface-300-700"
									>
										{#each editor().projects as project (project.name)}
											<Menu.Item value={project.name}>
												<Menu.ItemText>{project.name}</Menu.ItemText>
											</Menu.Item>
										{/each}
									</Menu.Content>
								</Menu.Positioner>
							</Portal>
						</Menu.TriggerItem>
					</Menu>
					<Menu.Separator class="border-surface-300-700" />
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel class="text-surface-800-200">
							{editor().project.name}
						</Menu.ItemGroupLabel>
						{@render menu_item_command(
							'clone',
							'Clone...',
							'show-modal',
							ID.clone_project_dialog,
						)}
						{@render menu_item_command(
							'rename',
							'Rename...',
							'show-modal',
							ID.rename_project_dialog,
						)}
						{@render menu_item_command(
							'delete',
							'Delete...',
							'show-modal',
							ID.delete_project_dialog,
						)}
					</Menu.ItemGroup>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu>
	<Menu onSelect={on_edit_menu_select}>
		<Menu.Trigger class="btn">Edit</Menu.Trigger>
		<Portal>
			<Menu.Positioner class="z-10!">
				<Menu.Content class="bg-surface-100-900 border-surface-300-700">
					<Menu.Item
						value="undo"
						closeOnSelect={false}
						disabled={!editor().can_undo}
					>
						<Menu.ItemText>Undo</Menu.ItemText>
						<kbd class="bg-surface-200-800 rounded-base p-1">ctrl+z</kbd>
					</Menu.Item>
					<Menu.Item
						value="redo"
						closeOnSelect={false}
						disabled={!editor().can_redo}
					>
						<Menu.ItemText>Redo</Menu.ItemText>
						<kbd class="bg-surface-200-800 rounded-base p-1">ctrl+y</kbd>
					</Menu.Item>
					<Menu.Separator class="border-surface-300-700" />
					{@render menu_item_command(
						'upload',
						'Upload Image...',
						'show-modal',
						ID.upload_image_dialog,
					)}
					<Menu.Item value="clear">
						<Menu.ItemText>Clear Canvas</Menu.ItemText>
					</Menu.Item>
					<Menu.Separator class="border-surface-300-700" />
					<Menu.OptionItem
						type="checkbox"
						value="snap_to_grid"
						closeOnSelect={false}
						checked={editor().project.grid_config.snap}
						onCheckedChange={(checked) => {
							editor().project = new Project({
								...editor().project,
								grid_config: new GridConfig({
									...editor().project.grid_config,
									snap: checked,
								}),
							});
						}}
					>
						<Menu.ItemText>Snap to Grid</Menu.ItemText>
						<Menu.ItemIndicator class="hidden data-[state=checked]:block ms-2">
							<CheckIcon class="size-4" />
						</Menu.ItemIndicator>
					</Menu.OptionItem>
					{@render menu_item_command(
						'configure_grid',
						'Configure Grid...',
						'show-modal',
						ID.configure_grid_dialog,
					)}
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu>
	<Menu>
		<Menu.Trigger class="btn">View</Menu.Trigger>
		<Portal>
			<Menu.Positioner class="z-10!">
				<Menu.Content class="bg-surface-100-900 border-surface-300-700">
					{@render menu_item_command(
						'reset',
						'Reset Camera',
						CUSTOM_COMMAND.reset_zoom,
						ID.canvas,
					)}
					<Menu positioning={{ offset: { mainAxis: 8, crossAxis: -8 } }}>
						<Menu.TriggerItem value="set_zoom">
							<Menu.ItemText>Set Zoom</Menu.ItemText>
							<Menu.ItemIndicator>
								<ChevronRightIcon class="size-4" />
							</Menu.ItemIndicator>
							<Portal>
								<Menu.Positioner class="z-10!">
									<Menu.Content
										class="bg-surface-100-900 border-surface-300-700"
									>
										{@render menu_item_command(
											'50%',
											'50%',
											CUSTOM_COMMAND.set_zoom_050,
											ID.canvas,
										)}
										{@render menu_item_command(
											'75%',
											'75%',
											CUSTOM_COMMAND.set_zoom_075,
											ID.canvas,
										)}
										{@render menu_item_command(
											'100%',
											'100%',
											CUSTOM_COMMAND.set_zoom_100,
											ID.canvas,
										)}
										{@render menu_item_command(
											'150%',
											'150%',
											CUSTOM_COMMAND.set_zoom_150,
											ID.canvas,
										)}
										{@render menu_item_command(
											'200%',
											'200%',
											CUSTOM_COMMAND.set_zoom_200,
											ID.canvas,
										)}
										{@render menu_item_command(
											'400%',
											'400%',
											CUSTOM_COMMAND.set_zoom_400,
											ID.canvas,
										)}
										{@render menu_item_command(
											'800%',
											'800%',
											CUSTOM_COMMAND.set_zoom_800,
											ID.canvas,
										)}
									</Menu.Content>
								</Menu.Positioner>
							</Portal>
						</Menu.TriggerItem>
					</Menu>
					<Menu.Separator class="border-surface-300-700" />
					<Menu positioning={{ offset: { mainAxis: 8, crossAxis: -8 } }}>
						<Menu.TriggerItem value="set_canvas_opacity">
							<Menu.ItemText>
								Canvas Opacity: {editor().current_step_canvas_opacity * 100}%
							</Menu.ItemText>
							<Menu.ItemIndicator>
								<ChevronRightIcon class="size-4" />
							</Menu.ItemIndicator>
							<Portal>
								<Menu.Positioner class="z-10!">
									<Menu.Content
										class="bg-surface-100-900 border-surface-300-700"
									>
										{@render menu_item_canvas_opacity(0)}
										{@render menu_item_canvas_opacity(0.1)}
										{@render menu_item_canvas_opacity(0.2)}
										{@render menu_item_canvas_opacity(0.3)}
										{@render menu_item_canvas_opacity(0.4)}
										{@render menu_item_canvas_opacity(0.5)}
										{@render menu_item_canvas_opacity(0.6)}
										{@render menu_item_canvas_opacity(0.7)}
										{@render menu_item_canvas_opacity(0.8)}
										{@render menu_item_canvas_opacity(0.9)}
										{@render menu_item_canvas_opacity(1.0)}
									</Menu.Content>
								</Menu.Positioner>
							</Portal>
						</Menu.TriggerItem>
					</Menu>
					<Menu.Separator class="border-surface-300-700" />
					<Menu.OptionItem
						type="checkbox"
						value="show_center_mark"
						closeOnSelect={false}
						checked={editor().view_settings.show_center_mark}
						onCheckedChange={(checked) => {
							editor().update_view_settings({ show_center_mark: checked });
						}}
					>
						<Menu.ItemText>Show Center Mark</Menu.ItemText>
						<Menu.ItemIndicator class="hidden data-[state=checked]:block ms-2">
							<CheckIcon class="size-4" />
						</Menu.ItemIndicator>
					</Menu.OptionItem>
					<Menu.OptionItem
						type="checkbox"
						value="show_map_limit"
						closeOnSelect={false}
						checked={editor().view_settings.show_map_limit}
						onCheckedChange={(checked) => {
							editor().update_view_settings({ show_map_limit: checked });
						}}
					>
						<Menu.ItemText>Show Map Limit</Menu.ItemText>
						<Menu.ItemIndicator class="hidden data-[state=checked]:block ms-2">
							<CheckIcon class="size-4" />
						</Menu.ItemIndicator>
					</Menu.OptionItem>
					<Menu.OptionItem
						type="checkbox"
						value="show_l_cluster"
						closeOnSelect={false}
						checked={editor().view_settings.show_l_cluster}
						onCheckedChange={(checked) => {
							editor().update_view_settings({ show_l_cluster: checked });
						}}
					>
						<Menu.ItemText>Show L-Cluster</Menu.ItemText>
						<Menu.ItemIndicator class="hidden data-[state=checked]:block ms-2">
							<CheckIcon class="size-4" />
						</Menu.ItemIndicator>
					</Menu.OptionItem>
					<Menu.Separator class="border-surface-300-700" />
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel class="text-surface-800-200">
							Gigastructural Engineering
						</Menu.ItemGroupLabel>
						<Menu.OptionItem
							type="checkbox"
							value="show_giga_core"
							closeOnSelect={false}
							checked={editor().view_settings.show_giga_core}
							onCheckedChange={(checked) => {
								editor().update_view_settings({ show_giga_core: checked });
							}}
						>
							<Menu.ItemText>Show Random Core</Menu.ItemText>
							<Menu.ItemIndicator
								class="hidden data-[state=checked]:block ms-2"
							>
								<CheckIcon class="size-4" />
							</Menu.ItemIndicator>
						</Menu.OptionItem>
						<Menu.OptionItem
							type="checkbox"
							value="show_giga_aeternum"
							closeOnSelect={false}
							checked={editor().view_settings.show_giga_aeternum}
							onCheckedChange={(checked) => {
								editor().update_view_settings({ show_giga_aeternum: checked });
							}}
						>
							<Menu.ItemText>Show Aeternum</Menu.ItemText>
							<Menu.ItemIndicator
								class="hidden data-[state=checked]:block ms-2"
							>
								<CheckIcon class="size-4" />
							</Menu.ItemIndicator>
						</Menu.OptionItem>
					</Menu.ItemGroup>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu>
	<div class="grow"></div>
	<Menu>
		<Menu.Trigger class="btn">Community</Menu.Trigger>
		<Portal>
			<Menu.Positioner class="z-10!">
				<Menu.Content class="bg-surface-100-900 border-surface-300-700">
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel class="text-surface-800-200">
							Get Help and Give Suggestions
						</Menu.ItemGroupLabel>
						{@render menu_item_link(
							'steam',
							'Steam Workshop',
							'https://steamcommunity.com/sharedfiles/filedetails/?id=3532904115',
						)}
						{@render menu_item_link(
							'discord',
							'Discord',
							'https://discord.gg/72kaXW782b',
						)}
						{@render menu_item_link(
							'github',
							'Github',
							'https://github.com/oatmealproblem/paint-a-galaxy/issues',
						)}
					</Menu.ItemGroup>
					<Menu.Separator class="border-surface-300-700" />
					<Menu.ItemGroup>
						<Menu.ItemGroupLabel class="text-surface-800-200">
							Support Me
						</Menu.ItemGroupLabel>
						{@render menu_item_link(
							'github_sponsors',
							'Github Sponsors',
							'https://github.com/sponsors/oatmealproblem',
						)}
						{@render menu_item_link(
							'patreon',
							'Patreon',
							'https://patreon.com/oatmealproblem',
						)}
						{@render menu_item_link(
							'buy_me_a_coffee',
							'Buy Me a Coffee',
							'https://buymeacoffee.com/oatmealproblem',
						)}
					</Menu.ItemGroup>
				</Menu.Content>
			</Menu.Positioner>
		</Portal>
	</Menu>
</header>
