export interface InitializerMetadata {
	unique: boolean;
	name: null | string;
	description: string;
	before?: InitializerKey[];
	after?: InitializerKey;
	// there are more DLCs, but these are the only ones needed for initializer checks
	dlc: (
		| 'Ancient Relics'
		| 'Apocalypse'
		| 'Astral Planes'
		| 'Biogenesis'
		| 'Cosmic Storms'
		| 'Distant Stars'
		| 'Federations'
		| 'First Contact'
		| 'Galactic Paragons'
		| 'Grand Archive'
		| 'Infernals'
		| 'Leviathans'
		| 'Machine Age'
		| 'MegaCorp'
		| 'Overlord'
		| 'Shadows of the Shroud'
		| 'Utopia'
	)[];
}

export type InitializerKey =
	| 'relic_system_1'
	| 'Zrocursor_system'
	| 'relic_system_4'
	| 'last_baol_system'
	| 'mechanocalibrator_system'
	| 'rubricator_system'
	| 'abandoned_gateways_01'
	| 'ocean_paradise_start'
	| 'formless_system_initializer'
	| 'astral_scar_system'
	| 'starlit_sealed_1'
	| 'central_crystal_init_01'
	| 'weathermanipulators_home_system'
	| 'adSalivul_system'
	| 'adSul_system'
	| 'ai_system_01'
	| 'ai_system_02'
	| 'ai_system_03'
	| 'ai_system_04'
	| 'ai_system_05'
	| 'cybrex_beta'
	| 'sentinel_system'
	| 'custom_starting_init_01'
	| 'custom_starting_init_02'
	| 'custom_starting_init_03'
	| 'custom_starting_init_04'
	| 'custom_starting_init_05'
	| 'custom_starting_init_06'
	| 'titawin_init'
	| 'star_lifting_system'
	| 'vechtar_zavonia_system'
	| 'big_rip_system'
	| 'time_loop_world_system'
	| 'toxic_planet_toxic_moon'
	| 'shattered_world_system'
	| 'asteroid_system'
	| 'hostile_init_mining_drones'
	| 'hostile_init_amoeba'
	| 'hostile_init_void_cloud'
	| 'ice_system'
	| 'high_energy_system'
	| 'guardians_init_hatchling'
	| 'great_wound_system'
	| 'primitive_robot_system'
	| 'superflare_system'
	| 'collapse_system'
	| 'old_foes_system'
	| 'scavenger_system'
	| 'living_planet_system'
	| 'elderly_tiyanki_system'
	| 'ratling_1_1'
	| 'ratling_1_2'
	| 'ratling_1_3'
	| 'distar_crystal_system'
	| 'distar_sealed_1_1'
	| 'distar_sealed_1_2'
	| 'distar_pod_system'
	| 'distar_phaseshift_system'
	| 'distantstars_init_00'
	| 'distantstars_init_06'
	| 'distantstars_init_01'
	| 'distantstars_init_02'
	| 'distantstars_init_03'
	| 'distantstars_init_04'
	| 'distantstars_init_05'
	| 'distantstars_init_01b'
	| 'distantstars_init_02b'
	| 'distantstars_init_03b'
	| 'distantstars_init_04b'
	| 'star_crazy_fallback_system'
	| 'random_empire_init_01'
	| 'random_empire_init_02'
	| 'random_empire_init_03'
	| 'random_empire_init_04'
	| 'random_empire_init_05'
	| 'random_empire_init_06'
	| 'neighbor_t1'
	| 'neighbor_t1_first_colony'
	| 'neighbor_t2'
	| 'neighbor_t2_second_colony'
	| 'example_initializer'
	| 'example_neighbor'
	| 'new_bratulla_initializer'
	| 'fallen_1'
	| 'fallen_1_2'
	| 'fallen_2'
	| 'fallen_3'
	| 'fallen_4'
	| 'fallen_col_1'
	| 'fallen_col_2'
	| 'fallen_orbitals_1'
	| 'fallen_orbitals_2'
	| 'fallen_shrouded'
	| 'fallen_shielded_1'
	| 'fallen_shielded_2'
	| 'fallen_shielded_3'
	| 'fallen_holy_01'
	| 'fallen_holy_02'
	| 'fallen_holy_03'
	| 'fallen_holy_04'
	| 'fallen_xeno_zoo'
	| 'fallen_machine'
	| 'fallen_machine_2'
	| 'fallen_machine_3'
	| 'fallen_machine_4'
	| 'fallen_machine_5'
	| 'fallen_hive_last_thought'
	| 'fallen_hive_war'
	| 'fallen_hive_war_2'
	| 'fallen_hive_war_3'
	| 'fallen_hive_growth'
	| 'fallen_hive_growth_2'
	| 'fallen_hive_growth_3'
	| 'fallen_hive_control'
	| 'fallen_hive_control_2'
	| 'fallen_hive_control_3'
	| 'hauer_system_initializer'
	| 'intercepting_history_system_initializer_01'
	| 'intercepting_history_system_initializer_02'
	| 'relentless_pursuit_system_initializer_01'
	| 'relentless_pursuit_system_initializer_02'
	| 'void_dweller_system'
	| 'lost_colony_1'
	| 'lost_colony_neighbor_t1'
	| 'lost_colony_neighbor_t1_first_colony'
	| 'lost_colony_neighbor_t2_second_colony'
	| 'scion_fallen_1'
	| 'scion_fallen_2'
	| 'shattered_ring_start'
	| 'mega_shipyard_init_01'
	| 'planet_with_too_many_moons_system'
	| 'wenkwort_initializer'
	| 'sol_system_void_dweller_system'
	| 'msi_home_system'
	| 'slavers_neighbor_t1'
	| 'slavers_neighbor_t1_first_colony'
	| 'slavers_neighbor_t2_second_colony'
	| 'fear_of_the_dark_system'
	| 'hunter_of_the_dark_system'
	| 'broken_shackles_parent_system'
	| 'solarpunk_01'
	| 'solarpunk_02'
	| 'voidworms_spawn_system_tiny'
	| 'voidworms_spawn_system_small'
	| 'voidworms_spawn_system_medium'
	| 'voidworms_spawn_system_large'
	| 'voidworms_spawn_system_huge'
	| 'hidden_treasure_system_initializer'
	| 'black_needle_base_initializer'
	| 'smeegibb_shelter_initializer'
	| 'gateway_to_ness_treasure_initializer'
	| 'ness_treasure_initializer'
	| 'frenzied_voidworms_system'
	| 'hostile_init_01'
	| 'hostile_init_02'
	| 'hostile_init_03'
	| 'hostile_init_04'
	| 'hostile_init_05'
	| 'hostile_init_06'
	| 'hostile_init_07'
	| 'hostile_init_08'
	| 'hostile_init_10'
	| 'hostile_init_10_small_amoeba_pack'
	| 'hostile_init_11'
	| 'hostile_init_12'
	| 'hostile_init_12_mining_drones'
	| 'hostile_init_12_drone_destroyer'
	| 'hostile_init_13'
	| 'hostile_init_14'
	| 'hostile_init_15'
	| 'hostile_init_16'
	| 'hostile_init_18'
	| 'hostile_init_20'
	| 'hostile_init_21'
	| 'hostile_init_22'
	| 'red_giant_start'
	| 'red_giant_lusus'
	| 'neighbor_t1_first_inf_colony'
	| 'cosmic_dawn_start'
	| 'hyperthermia_system'
	| 'oasis_system'
	| 'guardians_artist_init_01'
	| 'guardians_artist_init_02'
	| 'guardians_artist_init_03'
	| 'guardians_curator_init_01'
	| 'guardians_curator_init_02'
	| 'guardians_curator_init_03'
	| 'guardians_trader_init_01'
	| 'guardians_trader_init_02'
	| 'guardians_trader_init_03'
	| 'guardians_init_stellarites'
	| 'guardians_init_dragon'
	| 'guardians_init_horror'
	| 'guardians_init_dreadnought'
	| 'guardians_init_hive'
	| 'guardians_init_technosphere'
	| 'guardians_init_fortress'
	| 'guardians_init_wraith'
	| 'arc_welders_construction_system'
	| 'ruined_arc_furnace_system'
	| 'marauder_1_1'
	| 'marauder_1_2'
	| 'marauder_1_3'
	| 'marauder_2_1'
	| 'marauder_2_2'
	| 'marauder_2_3'
	| 'marauder_3_1'
	| 'marauder_3_2'
	| 'marauder_3_3'
	| 'megacorp_caravaneer_init'
	| 'megacorp_matter_decompressor_init_01'
	| 'megacorp_strategic_coordination_center_init_01'
	| 'megacorp_mega_art_installation_init_01'
	| 'megacorp_interstellar_assembly_init_01'
	| 'mindwarden_enclave_initializer'
	| 'basic_init_01'
	| 'basic_init_02'
	| 'basic_init_03'
	| 'basic_init_04'
	| 'basic_init_05'
	| 'basic_init_06'
	| 'asteroid_init_01'
	| 'binary_init_01'
	| 'binary_init_02'
	| 'trinary_init_01'
	| 'trinary_init_02'
	| 'salvager_enclave_init_01'
	| 'salvager_enclave_init_02'
	| 'salvager_enclave_init_03'
	| 'shroudwalker_enclave_init_01'
	| 'shroudwalker_enclave_init_02'
	| 'shroudwalker_enclave_init_03'
	| 'broken_shroudwalker_init_01'
	| 'quantum_catapult_init_01'
	| 'orbital_ring_init_01'
	| 'overlord_system_init'
	| 'overlord_system_2_init'
	| 'overlord_system_3_init'
	| 'overlord_system_4_init'
	| 'overlord_system_5_init'
	| 'overlord_system_6_init'
	| 'overlord_system_7_init'
	| 'overlord_system_8_init'
	| 'legendary_leader_start_site'
	| 'legendary_leader_1st_site'
	| 'legendary_leader_2nd_site'
	| 'legendary_leader_3rd_site'
	| 'legendary_leader_last_site'
	| 'pre_ftl_init_01'
	| 'pre_ftl_init_sol'
	| 'sanctuary_system'
	| 'pre_ftl_hive_init_01'
	| 'pre_ftl_deneb_system'
	| 'pre_ftl_shattered_ring'
	| 'pre_ftl_inf_init_01'
	| 'pre_ftl_inf_hive_init_01'
	| 'deneb_system'
	| 'une_deneb_system'
	| 'deneb_neighbor_t1'
	| 'deneb_neighbor_t1_first_colony'
	| 'deneb_neighbor_t2_second_colony'
	| 'vultaumar_system'
	| 'yuhtaan_system'
	| 'fen_habbanis_system'
	| 'irass_system'
	| 'cybrex_system'
	| 'ai_titawin_init'
	| 'mindwarden_system_init'
	| 'mindwarden_buffer_system'
	| 'exiled_system_1'
	| 'exiled_system_2'
	| 'exiled_system_3'
	| 'exiled_system_4'
	| 'exiled_system_5'
	| 'sol_system_initializer'
	| 'sol_neighbor_t1'
	| 'sol_neighbor_t1_first_colony'
	| 'sol_neighbor_t1_no_guaranteed_colony'
	| 'sol_neighbor_t2'
	| 'sol_neighbor_t2_second_colony'
	| 'sol_neighbor_t2_no_guaranteed_colony'
	| 'com_sol_system'
	| 'ai_sol_system'
	| 'com_sol_neighbor_t1_first_colony'
	| 'com_sol_neighbor_t1'
	| 'com_sol_neighbor_t2_second_colony'
	| 'lost_colony_sol_system'
	| 'lost_colony_sol_neighbor_t1_first_colony'
	| 'lost_colony_sol_neighbor_t1'
	| 'lost_colony_sol_neighbor_t2_second_colony'
	| 'toxic_knights_sol_start'
	| 'sol_system_fear_of_the_dark_system'
	| 'special_init_04'
	| 'init_sol_geocentric'
	| 'mindwarden_sol_system_init'
	| 'mindwarden_sol_buffer_system'
	| 'special_init_01'
	| 'special_init_06'
	| 'special_init_07'
	| 'special_init_08'
	| 'special_init_09'
	| 'hyacinth_system'
	| 'ai_system_1'
	| 'crystal_manufactory_system'
	| 'trappist_initializer'
	| 'parvus_system'
	| 'polaris_civilization'
	| 'fumongus_init_01'
	| 'ghost_ship_system_initializer_01'
	| 'surveillance_supercomputer_system'
	| 'locust_system_initializer_01'
	| 'holibrae_initializer'
	| 'debris_belt_initializer'
	| 'the_chosen_home_initializer'
	| 'the_chosen_resources_initializer'
	| 'the_chosen_resources_initializer2'
	| 'the_chosen_gate_initializer'
	| 'the_chosen_escapee_initializer'
	| 'the_star_mall_initializer'
	| 'breachsealer_system'
	| 'metal_planet_system_initializer'
	| 'previously_terraformed_planet_system_initializer'
	| 'collided_planet_system_initializer'
	| 'wooden_planet_system_initializer'
	| 'toxic_knights_start'
	| 'toxic_knights_finish'
	| 'unique_system_initializer_01'
	| 'unique_system_initializer_02'
	| 'unique_system_initializer_03'
	| 'unique_system_initializer_04'
	| 'unique_system_initializer_05'
	| 'unique_system_initializer_06'
	| 'unique_system_initializer_07'
	| 'unique_system_initializer_08'
	| 'unique_system_initializer_09'
	| 'lone_defender'
	| 'origin_unplugged_starting_system_init'
	| 'sol_system_unplugged_initializer'
	| 'origin_unplugged_machine_legacy_core_system_init'
	| 'origin_unplugged_machine_legacy_periphery_system_init'
	| 'unplugged_machine_legacy_tomb_1_system_init'
	| 'unplugged_machine_legacy_tomb_2_system_init'
	| 'unplugged_machine_legacy_tomb_3_system_init'
	| 'unplugged_machine_legacy_tomb_4_system_init'
	| 'dyson_sphere_init_01'
	| 'science_nexus_init_01'
	| 'sentry_array_init_01'
	| 'ring_world_init_01'
	| 'zroni_legacy_initializer_01'
	| 'zroni_legacy_initializer_02'
	| 'zroni_legacy_initializer_03';

export const initializer_metadata: Record<
	InitializerKey,
	InitializerMetadata | null
> = {
	// ancient_relics_initializers.txt
	relic_system_1: {
		unique: true,
		name: null,
		description: 'Shielded Planet / Armistice Initiative',
		dlc: ['Ancient Relics'],
	},
	Zrocursor_system: null, // "Zron" event
	relic_system_4: {
		unique: true,
		name: null,
		description: 'Ruined World / Omnicodex',
		dlc: ['Ancient Relics'],
	},
	last_baol_system: null, // "Grunur" event
	mechanocalibrator_system: {
		unique: true,
		name: null,
		description: 'C.A.R.E. / Planetary Machinery',
		dlc: ['Ancient Relics'],
	},
	rubricator_system: null, // event

	// apocalypse_initalizers.txt
	abandoned_gateways_01: {
		unique: false,
		name: null,
		description: 'Ruined Gateway',
		dlc: [],
	},

	// aquatics_initializers.txt
	ocean_paradise_start: null, // origin

	// astral_planes_initializers.txt
	formless_system_initializer: null, // "azilash" event
	astral_scar_system: {
		unique: true,
		name: null,
		description: 'Astral Scar (Non-DLC Anomaly)',
		dlc: [],
	},

	// biogenesis_initializers.txt
	starlit_sealed_1: null, // event

	// central_crystal_initializers.txt
	central_crystal_init_01: null, // "The Outer Gate" event

	// cosmic_storm_initializers.txt
	weathermanipulators_home_system: null, // event
	adSalivul_system: null, // "adSalivul" event
	adSul_system: null, // "adSul" event

	// crisis_initializers
	ai_system_01: {
		unique: true,
		name: null,
		description: 'Contingency Sterilization Hub 001',
		dlc: [],
	},
	ai_system_02: {
		unique: true,
		name: null,
		description: 'Contingency Sterilization Hub 002',
		dlc: [],
	},
	ai_system_03: {
		unique: true,
		name: null,
		description: 'Contingency Sterilization Hub 003',
		dlc: [],
	},
	ai_system_04: {
		unique: true,
		name: null,
		description: 'Contingency Sterilization Hub 004',
		dlc: [],
	},
	ai_system_05: null, // "CX-9881" event
	cybrex_beta: null, // "Cybrex Beta" event
	sentinel_system: null, // event

	// custom_starting_initializers.txt
	custom_starting_init_01: null, // starting
	custom_starting_init_02: null, // starting
	custom_starting_init_03: null, // starting
	custom_starting_init_04: null, // starting
	custom_starting_init_05: null, // starting
	custom_starting_init_06: null, // starting
	titawin_init: null, // "Titawin" starting

	// distant_stars_initializers.txt
	star_lifting_system: {
		unique: true,
		name: null,
		description: 'Deserted Star Platform',
		dlc: ['Distant Stars'],
	},
	vechtar_zavonia_system: null, // event
	big_rip_system: {
		unique: true,
		name: null,
		description: 'Abandoned Observation Post',
		dlc: ['Distant Stars'],
	},
	time_loop_world_system: {
		unique: true,
		name: null,
		description: 'Shielded World / Time Loop / Prikkiki-Ti',
		dlc: ['Distant Stars'],
	},
	toxic_planet_toxic_moon: {
		unique: true, // no events/anomalies/digs
		name: null,
		description: 'Crucible of Life',
		dlc: ['Distant Stars'],
	},
	shattered_world_system: {
		unique: true, // no events/anomalies/digs
		name: null,
		description: 'Shattered World',
		dlc: ['Distant Stars'],
	},
	asteroid_system: {
		unique: true, // no events/anomalies/digs
		name: null,
		description: 'Asteroid (not randomized)',
		dlc: ['Distant Stars'],
	},
	hostile_init_mining_drones: {
		unique: false, // max 2
		name: null,
		description: 'Mining Drones Large Fleet',
		dlc: ['Distant Stars'],
	},
	hostile_init_amoeba: {
		unique: false, // max 2
		name: null,
		description: 'Space Amoeba Large Pack',
		dlc: ['Distant Stars'],
	},
	hostile_init_void_cloud: {
		unique: true,
		name: null,
		description: 'Void Cloud / Damaged Ringworld',
		dlc: ['Distant Stars'],
	},
	ice_system: {
		unique: true, // no events/anomalies/digs
		name: null,
		description: 'Ice Asteroids / Frozen Planets / 2 Arctic Worlds)',
		dlc: ['Distant Stars'],
	},
	high_energy_system: {
		unique: true, // no events/anomalies/digs
		name: null,
		description: 'High Energy',
		dlc: ['Distant Stars'],
	},
	guardians_init_hatchling: {
		unique: true,
		name: null,
		description: 'Voidspawn Egg',
		dlc: ['Biogenesis', 'Distant Stars'],
	},
	great_wound_system: {
		unique: true,
		name: 'Great Wound',
		description: 'Void Cloud Home',
		dlc: [], // not a mistake
	},
	primitive_robot_system: {
		unique: true,
		name: null,
		description: 'Symmetrical Structures / Rudimentary Robots',
		dlc: ['Distant Stars'],
	},
	superflare_system: {
		unique: true,
		name: null,
		description: 'Superflare / Traces of Civilization / Frozen in Time',
		dlc: ['Distant Stars'],
	},
	collapse_system: {
		unique: true,
		name: null,
		description: 'Dilapidated Station / Particular Fears',
		dlc: ['Distant Stars'],
	},
	old_foes_system: {
		unique: true,
		name: null,
		description: 'Duppelgangers / Old Foes',
		dlc: ['Distant Stars'],
	},
	scavenger_system: {
		unique: true,
		name: null,
		description: 'The Scavenger / Scavenger Bot',
		dlc: ['Distant Stars'],
	},
	living_planet_system: {
		unique: true,
		name: null,
		description: 'Haunting Sea / Living Sea / Sea of Consciousness',
		dlc: ['Distant Stars'],
	},
	elderly_tiyanki_system: {
		unique: true,
		name: null,
		description: 'Tiyanki Matriarch',
		dlc: ['Distant Stars'],
	},
	ratling_1_1: {
		unique: true,
		name: null,
		description: 'Ruined Worlds / Ratlings / Ketling Star Pack 1',
		dlc: ['Distant Stars'],
		before: ['ratling_1_2', 'ratling_1_3'],
	},
	ratling_1_2: {
		unique: true, // neighbor of ratling 1_1
		name: null,
		description: 'Ruined Worlds / Ratlings / Ketling Star Pack 2',
		dlc: ['Distant Stars'],
		after: 'ratling_1_1',
	},
	ratling_1_3: {
		unique: true, // neighbor of ratling 1_1
		name: null,
		description: 'Ruined Worlds / Ratlings / Ketling Star Pack 3',
		dlc: ['Distant Stars'],
		after: 'ratling_1_1',
	},
	distar_crystal_system: {
		unique: false, // max 2
		name: null,
		description: 'Crystals',
		dlc: ['Distant Stars'],
	},
	distar_sealed_1_1: null, // event
	distar_sealed_1_2: null, // event
	distar_pod_system: {
		unique: true,
		name: null,
		description: 'Unidentified Drop Pods / The Caretaker',
		dlc: ['Distant Stars'],
	},
	distar_phaseshift_system: {
		unique: true,
		name: null,
		description: 'Phased Planet / Phase-Shifted / The Veil',
		dlc: ['Distant Stars'],
	},
	distantstars_init_00: {
		unique: false,
		name: null,
		description: 'L-Gate',
		dlc: ['Distant Stars'],
	},
	distantstars_init_06: {
		unique: true,
		name: null,
		description: 'Guaranteed L-Gate',
		dlc: ['Distant Stars'],
	},
	distantstars_init_01: null, // "Terminal Egress" event
	distantstars_init_02: null, // event
	distantstars_init_03: null, // event
	distantstars_init_04: null, // event
	distantstars_init_05: null, // event
	distantstars_init_01b: null, // event
	distantstars_init_02b: null, // event
	distantstars_init_03b: null, // event
	distantstars_init_04b: null, // event
	star_crazy_fallback_system: null, // event

	// empire_initializers.txt
	random_empire_init_01: null, // starting
	random_empire_init_02: null, // starting
	random_empire_init_03: null, // starting
	random_empire_init_04: null, // starting
	random_empire_init_05: null, // starting
	random_empire_init_06: null, // starting
	neighbor_t1: null, // guaranteed
	neighbor_t1_first_colony: null, // guaranteed
	neighbor_t2: null, // guaranteed
	neighbor_t2_second_colony: null, // guaranteed

	// example.txt
	example_initializer: null, // never
	example_neighbor: null, // never

	// extreme_frontiers_initializers.txt
	new_bratulla_initializer: null, // "New Bratulla" event

	// fallen_empires_initializers.txt
	fallen_1: null, // FE
	fallen_1_2: null, // FE
	fallen_2: null, // FE
	fallen_3: null, // FE
	fallen_4: null, // FE
	fallen_col_1: null, // FE
	fallen_col_2: null, // FE
	fallen_orbitals_1: null, // FE
	fallen_orbitals_2: null, // FE
	fallen_shrouded: null, // FE
	fallen_shielded_1: null, // FE
	fallen_shielded_2: null, // FE
	fallen_shielded_3: null, // FE
	fallen_holy_01: {
		unique: true,
		name: null,
		description: 'Fallen Empire Holy World 1 / Walled Garden',
		dlc: [],
	},
	fallen_holy_02: {
		unique: true,
		name: null,
		description: 'Fallen Empire Holy World 2 / Emerald Mausoleum',
		dlc: [],
	},
	fallen_holy_03: {
		unique: true,
		name: null,
		description: 'Fallen Empire Holy World 3 / Pristine Jewel',
		dlc: [],
	},
	fallen_holy_04: {
		unique: true,
		name: null,
		description: "Fallen Empire Holy World 4 / Prophet's Retreat",
		dlc: [],
	},
	fallen_xeno_zoo: null, // FE
	fallen_machine: null, // "Alpha Refuge" FE
	fallen_machine_2: null, // "Beta Refuge" FE
	fallen_machine_3: null, // "Gamma Refuge" FE
	fallen_machine_4: null, // "Delta Refuge" FE
	fallen_machine_5: null, // "Custodian Nexus" FE
	fallen_hive_last_thought: null, // "Last Thought" FE
	fallen_hive_war: null, // FE
	fallen_hive_war_2: null, // FE
	fallen_hive_war_3: null, // FE
	fallen_hive_growth: null, // FE
	fallen_hive_growth_2: null, // FE
	fallen_hive_growth_3: null, // FE
	fallen_hive_control: null, // FE
	fallen_hive_control_2: null, // FE
	fallen_hive_control_3: null, // FE

	// federations_initializers.txt
	hauer_system_initializer: {
		unique: true,
		name: 'Hauer',
		description: 'Tannhäuser Gate / Never Forget',
		dlc: [], // not a mistake
	},
	intercepting_history_system_initializer_01: null, // event
	intercepting_history_system_initializer_02: null, // event
	relentless_pursuit_system_initializer_01: null, // event
	relentless_pursuit_system_initializer_02: null, // event
	void_dweller_system: null, // origin
	lost_colony_1: null, // TODO
	lost_colony_neighbor_t1: null, // guaranteed
	lost_colony_neighbor_t1_first_colony: null, // guaranteed
	lost_colony_neighbor_t2_second_colony: null, // guaranteed
	scion_fallen_1: null, // event
	scion_fallen_2: null, // event
	shattered_ring_start: null, // origin
	mega_shipyard_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Mega Shipyard',
		dlc: ['Federations'],
	},
	planet_with_too_many_moons_system: {
		unique: true,
		name: null,
		description: 'Ruined Starbase / Shallash / Fall of the Shalarians',
		dlc: [], // not a mistake
	},
	wenkwort_initializer: {
		unique: true,
		name: 'Wenkwort',
		description: 'Wenkwort Artem / Planetscape Garden',
		dlc: [], // not a mistake
	},
	sol_system_void_dweller_system: null, // origin

	// first_contact_initializers.txt
	msi_home_system: {
		unique: true,
		name: null,
		description: 'MSI Home',
		dlc: ['First Contact'],
	},
	slavers_neighbor_t1: null, // guaranteed
	slavers_neighbor_t1_first_colony: null, // guaranteed
	slavers_neighbor_t2_second_colony: null, // guaranteed
	fear_of_the_dark_system: null, // origin
	hunter_of_the_dark_system: null, // event
	broken_shackles_parent_system: null, // TODO
	solarpunk_01: {
		unique: true,
		name: 'Helito',
		description: 'Missing Planets / Solarpunk / Habinte Unified Worlds',
		dlc: ['First Contact'],
	},
	solarpunk_02: null, // "Dacha" event

	// grand_archive_initializers.txt
	voidworms_spawn_system_tiny: {
		unique: true,
		name: null,
		description: 'Tiny Voidworms',
		dlc: ['Grand Archive'],
	},
	voidworms_spawn_system_small: {
		unique: true,
		name: null,
		description: 'Small Voidworms',
		dlc: ['Grand Archive'],
	},
	voidworms_spawn_system_medium: {
		unique: true,
		name: null,
		description: 'Medium Voidworms',
		dlc: ['Grand Archive'],
	},
	voidworms_spawn_system_large: {
		unique: true,
		name: null,
		description: 'Large Voidworms',
		dlc: ['Grand Archive'],
	},
	voidworms_spawn_system_huge: {
		unique: true,
		name: null,
		description: 'Huge Voidworms',
		dlc: ['Grand Archive'],
	},
	hidden_treasure_system_initializer: null, // event
	black_needle_base_initializer: null, // event
	smeegibb_shelter_initializer: null, // event
	gateway_to_ness_treasure_initializer: null, // event
	ness_treasure_initializer: null, // event
	frenzied_voidworms_system: null, // event

	// hostile_system_initializers.txt
	hostile_init_01: {
		unique: true,
		name: null,
		description: 'Blue Crystals / Saphire Lurkers',
		dlc: [],
	},
	hostile_init_02: {
		unique: true,
		name: null,
		description: 'Blue Crystals / Saphire Lurkers 2',
		dlc: [],
	},
	hostile_init_03: {
		unique: true,
		name: null,
		description: 'Green Crystals / Emerald Roamers',
		dlc: [],
	},
	hostile_init_04: {
		unique: true,
		name: null,
		description: 'Green Crystals / Emerald Roamers 2',
		dlc: [],
	},
	hostile_init_05: {
		unique: true,
		name: null,
		description: 'Red Crystals / Ruby Stack',
		dlc: [],
	},
	hostile_init_06: {
		unique: true,
		name: null,
		description: 'Red Crystals / Ruby Stack 2',
		dlc: [],
	},
	hostile_init_07: {
		unique: true,
		name: null,
		description: 'Elite Crystals / Crystal Nidus',
		dlc: [],
	},
	hostile_init_08: {
		unique: false,
		name: null,
		description: 'Void Clouds',
		dlc: [],
	},
	hostile_init_10: {
		unique: false,
		name: null,
		description: 'Space Amoeba Large Pack',
		dlc: [],
	},
	hostile_init_10_small_amoeba_pack: {
		unique: false,
		name: null,
		description: 'Space Amoeba Small Pack',
		dlc: [],
	},
	hostile_init_11: {
		unique: false,
		name: null,
		description: 'Space Amoeba Roaming',
		dlc: [],
	},
	hostile_init_12: {
		unique: false,
		name: null,
		description: 'Mining Drones 1',
		dlc: [],
	},
	hostile_init_12_mining_drones: {
		unique: false,
		name: null,
		description: 'Mining Drones 2',
		dlc: [],
	},
	hostile_init_12_drone_destroyer: {
		unique: false,
		name: null,
		description: 'Mining Drones Destroyer',
		dlc: [],
	},
	hostile_init_13: {
		unique: false,
		name: null,
		description: 'Mining Drones 3',
		dlc: [],
	},
	hostile_init_14: {
		unique: true,
		name: null,
		description: 'Mining Drones Home',
		dlc: [],
	},
	hostile_init_15: {
		unique: false,
		name: null,
		description: 'Tiyanki',
		dlc: [],
	},
	hostile_init_16: {
		unique: true,
		name: 'Tiyana Vek',
		description: 'Tiyanki Spawn',
		dlc: [],
	},
	hostile_init_18: {
		unique: true,
		name: null,
		description: 'Privateers',
		dlc: [],
	},
	hostile_init_20: {
		unique: true,
		name: 'Amor Alveo',
		description: 'Space Amoeba Home',
		dlc: [],
	},
	hostile_init_21: {
		unique: true,
		name: 'Tiyun Ort',
		description: 'Tiyanki Graveyard',
		dlc: [],
	},
	hostile_init_22: {
		unique: true,
		name: 'Klendath',
		description: 'Mining Drones 4',
		dlc: [],
	},

	// infernals_system_initializers.txt
	red_giant_start: null, // origin
	red_giant_lusus: null, // "Lusus" event
	neighbor_t1_first_inf_colony: null, // guaranteed
	cosmic_dawn_start: null, // origin
	hyperthermia_system: null, // event
	oasis_system: {
		unique: true,
		name: 'Kira',
		description: 'Infernal Oasis / Hellish Oasis / Vermilion',
		dlc: ['Infernals'],
	},

	// leviathans_system_initializers.txt
	guardians_artist_init_01: {
		unique: true,
		name: null,
		description: 'Artist Enclave 1',
		dlc: ['Leviathans'],
	},
	guardians_artist_init_02: {
		unique: true,
		name: null,
		description: 'Artist Enclave 2',
		dlc: ['Leviathans'],
	},
	guardians_artist_init_03: {
		unique: true,
		name: null,
		description: 'Artist Enclave 3',
		dlc: ['Leviathans'],
	},
	guardians_curator_init_01: {
		unique: true,
		name: null,
		description: 'Curator Enclave 1',
		dlc: ['Distant Stars', 'Grand Archive', 'Leviathans'],
	},
	guardians_curator_init_02: {
		unique: true,
		name: null,
		description: 'Curator Enclave 2',
		dlc: ['Distant Stars', 'Grand Archive', 'Leviathans'],
	},
	guardians_curator_init_03: {
		unique: true,
		name: null,
		description: 'Curator Enclave 3',
		dlc: ['Distant Stars', 'Grand Archive', 'Leviathans'],
	},
	guardians_trader_init_01: {
		unique: true,
		name: null,
		description: 'XuraCorp / Trader Enclave 1',
		dlc: ['Leviathans'],
	},
	guardians_trader_init_02: {
		unique: true,
		name: null,
		description: 'Riggan Commerce Exchange / Trader Enclave 2',
		dlc: ['Leviathans'],
	},
	guardians_trader_init_03: {
		unique: true,
		name: null,
		description: 'Muutagen Merchant Guild / Trader Enclave 3',
		dlc: ['Leviathans'],
	},
	guardians_init_stellarites: {
		unique: true,
		name: null,
		description: 'Stellarite Devourer',
		dlc: ['Leviathans'],
	},
	guardians_init_dragon: {
		unique: true,
		name: null,
		description: "Ether Drake / Voidwyrm / Dragon's Hoard",
		dlc: ['Leviathans'],
	},
	guardians_init_horror: {
		unique: true,
		name: null,
		description: 'Dimensional Horror',
		dlc: ['Leviathans'],
	},
	guardians_init_dreadnought: {
		unique: true,
		name: null,
		description: 'Automated Dreadnought',
		dlc: ['Leviathans'],
	},
	guardians_init_hive: {
		unique: true,
		name: null,
		description: 'Crystalline Asteroids / Dormant Hive / Alien Hive',
		dlc: ['Leviathans'],
	},
	guardians_init_technosphere: {
		unique: true,
		name: 'Gargantua',
		description: 'Infinity Machine',
		dlc: ['Leviathans'],
	},
	guardians_init_fortress: {
		unique: true,
		name: null,
		description: 'Enigmatic Fortress',
		dlc: ['Leviathans'],
	},
	guardians_init_wraith: {
		unique: true,
		name: null,
		description: 'Spectral Clockwork / Pulse Germination / Spectral Wraith',
		dlc: ['Leviathans'],
	},

	// machine_age_initializers.txt
	arc_welders_construction_system: null, // event
	ruined_arc_furnace_system: {
		unique: true,
		name: null,
		description: 'Ruined Arc Furnace',
		dlc: ['Machine Age'],
	},

	// marauder_initializers.txt
	marauder_1_1: {
		unique: true,
		name: null,
		description: 'Marauder 1 (proud) Capital',
		dlc: ['Apocalypse'],
		before: ['marauder_1_2', 'marauder_1_3'],
	},
	marauder_1_2: {
		unique: true,
		name: null,
		description: 'Marauder 1 (proud) System 2',
		dlc: ['Apocalypse'],
		after: 'marauder_1_1',
	},
	marauder_1_3: {
		unique: true,
		name: null,
		description: 'Marauder 1 (proud) System 3',
		dlc: ['Apocalypse'],
		after: 'marauder_1_1',
	},
	marauder_2_1: {
		unique: true,
		name: null,
		description: 'Marauder 2 (abnoxious) Capital',
		dlc: ['Apocalypse'],
		before: ['marauder_2_2', 'marauder_2_3'],
	},
	marauder_2_2: {
		unique: true,
		name: null,
		description: 'Marauder 2 (abnoxious) System 2',
		dlc: ['Apocalypse'],
		after: 'marauder_2_1',
	},
	marauder_2_3: {
		unique: true,
		name: null,
		description: 'Marauder 2 (abnoxious) System 3',
		dlc: ['Apocalypse'],
		after: 'marauder_2_1',
	},
	marauder_3_1: {
		unique: true,
		name: null,
		description: 'Marauder 3 (religious) Capital',
		dlc: ['Apocalypse'],
		before: ['marauder_3_2', 'marauder_3_3'],
	},
	marauder_3_2: {
		unique: true,
		name: null,
		description: 'Marauder 3 (religious) System 2',
		dlc: ['Apocalypse'],
		after: 'marauder_3_1',
	},
	marauder_3_3: {
		unique: true,
		name: null,
		description: 'Marauder 3 (religious) System 3',
		dlc: ['Apocalypse'],
		after: 'marauder_3_1',
	},

	// megacorp_initializers.txt
	megacorp_caravaneer_init: {
		unique: true,
		name: "Chor's Compass",
		description: 'Caravaneers',
		dlc: ['MegaCorp'],
	},
	megacorp_matter_decompressor_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Matter Decompressor',
		dlc: ['MegaCorp'],
	},
	megacorp_strategic_coordination_center_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Strategic Coordination Center',
		dlc: ['MegaCorp'],
	},
	megacorp_mega_art_installation_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Mega Art Installation',
		dlc: ['MegaCorp'],
	},
	megacorp_interstellar_assembly_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Interstellar Assembly',
		dlc: ['MegaCorp'],
	},

	// mindwarden_initializers.txt
	mindwarden_enclave_initializer: {
		unique: true,
		name: null,
		description: 'Mindwardens Enclave',
		dlc: ['Shadows of the Shroud'],
	},

	// misc_system_initializers.txt
	basic_init_01: {
		unique: false,
		name: null,
		description: 'Basic 1',
		dlc: [],
	},
	basic_init_02: {
		unique: false,
		name: null,
		description: 'Basic 2',
		dlc: [],
	},
	basic_init_03: {
		unique: false,
		name: null,
		description: 'Basic 3',
		dlc: [],
	},
	basic_init_04: {
		unique: false,
		name: null,
		description: 'Basic 4',
		dlc: [],
	},
	basic_init_05: {
		unique: false,
		name: null,
		description: 'Basic 5',
		dlc: [],
	},
	basic_init_06: {
		unique: false,
		name: null,
		description: 'Basic 6',
		dlc: [],
	},
	asteroid_init_01: {
		unique: false,
		name: null,
		description: 'Basic Asteroid',
		dlc: [],
	},
	binary_init_01: {
		unique: false,
		name: null,
		description: 'Basic Binary 1',
		dlc: [],
	},
	binary_init_02: {
		unique: false,
		name: null,
		description: 'Basic Binary 2',
		dlc: [],
	},
	trinary_init_01: {
		unique: false,
		name: null,
		description: 'Basic Trinary 1',
		dlc: [],
	},
	trinary_init_02: {
		unique: false,
		name: null,
		description: 'Basic Trinary 2',
		dlc: [],
	},

	// nebula_test_initializers.txt
	// test_init_03: null, // never
	// test_init_01: null, // never
	// test_init_02: null, // never
	// test_init_05: null, // never
	// test_init_04: null, // never

	// overlord_initializers.txt
	salvager_enclave_init_01: {
		unique: true,
		name: null,
		description: 'Salvager Enclave',
		dlc: ['Overlord'],
	},
	salvager_enclave_init_02: {
		unique: true,
		name: null,
		description: 'Salvager Enclave Ruined Starbase',
		dlc: ['Overlord'],
	},
	salvager_enclave_init_03: {
		unique: true,
		name: null,
		description: 'Salvager Enclave Ruined Quantum Catapult',
		dlc: ['Overlord'],
	},
	shroudwalker_enclave_init_01: {
		unique: true,
		name: null,
		description: 'Shroudwalker Enclave 1',
		dlc: ['Overlord', 'Shadows of the Shroud'],
	},
	shroudwalker_enclave_init_02: {
		unique: true,
		name: null,
		description: 'Shroudwalker Enclave 2',
		dlc: ['Overlord', 'Shadows of the Shroud'],
	},
	shroudwalker_enclave_init_03: {
		unique: true,
		name: null,
		description: 'Shroudwalker Enclave 3',
		dlc: ['Overlord', 'Shadows of the Shroud'],
	},
	broken_shroudwalker_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Shroudwalker Enclave',
		dlc: ['Overlord', 'Shadows of the Shroud'],
	},
	quantum_catapult_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Quantum Catapult',
		dlc: ['Overlord'],
	},
	orbital_ring_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Orbital Ring',
		dlc: ['Overlord'],
	},
	overlord_system_init: null, // event
	overlord_system_2_init: null, // event
	overlord_system_3_init: null, // event
	overlord_system_4_init: null, // event
	overlord_system_5_init: null, // event
	overlord_system_6_init: null, // event
	overlord_system_7_init: null, // event
	overlord_system_8_init: null, // event

	// paragon_initializers.txt
	legendary_leader_start_site: {
		unique: true,
		name: 'Dugar',
		description: 'Keides, Scion of Vagros Start',
		dlc: ['Galactic Paragons'],
	},
	legendary_leader_1st_site: null, // "Vapob" event
	legendary_leader_2nd_site: null, // "Ivusheh" event
	legendary_leader_3rd_site: null, // "Taprib" event
	legendary_leader_last_site: null, // "Sursect" event

	// pre_ftl_initializers.txt
	pre_ftl_init_01: {
		unique: false,
		name: null,
		description: 'Pre-FTL',
		dlc: [],
	},
	pre_ftl_init_sol: null, // "Sol" event
	sanctuary_system: {
		unique: true,
		name: 'Sanctuary',
		description: 'Pre-FTL Ringworld',
		dlc: [],
	},
	pre_ftl_hive_init_01: {
		unique: false,
		name: null,
		description: 'Pre-FTL Hive Mind',
		dlc: ['Biogenesis', 'Utopia'],
	},
	pre_ftl_deneb_system: null, // "Deneb" TODO
	pre_ftl_shattered_ring: {
		unique: true,
		name: null,
		description: 'Pre-FTL Shattered Ringworld',
		dlc: ['Federations', 'First Contact'],
	},
	pre_ftl_inf_init_01: {
		unique: false,
		name: null,
		description: 'Pre-FTL Infernals',
		dlc: ['Infernals'],
	},
	pre_ftl_inf_hive_init_01: {
		unique: false,
		name: null,
		description: 'Pre-FTL Hive Mind Infernals',
		// technically this should (Infernals && Biogensis) || (Infernals && Utopia)
		// but Utopia will soon be folded into the base game, so this can be pre-simplified to just Infernals
		dlc: ['Infernals'],
	},

	// prescripted_species_systems.txt
	deneb_system: null, // "Deneb" starting
	une_deneb_system: null, // "Deneb" TODO
	deneb_neighbor_t1: null, // guaranteed
	deneb_neighbor_t1_first_colony: null, // guaranteed
	deneb_neighbor_t2_second_colony: null, // guaranteed
	vultaumar_system: null, // "Vultaumar" event
	yuhtaan_system: null, // "Yuhtaan" event
	fen_habbanis_system: null, // "Fen Habbanis" event
	irass_system: null, // "Irass" event
	cybrex_system: null, // "Cybrex Alpha" event
	ai_titawin_init: null, // "Titawin" event

	// shroud_initializers.txt
	mindwarden_system_init: null, // origin
	mindwarden_buffer_system: null, // event
	exiled_system_1: null, // event
	exiled_system_2: null, // event
	exiled_system_3: null, // event
	exiled_system_4: null, // event
	exiled_system_5: null, // event

	// sol_initializers.txt
	sol_system_initializer: null, // "Sol" starting
	sol_neighbor_t1: null, // "Barnard's Star" guaranteed
	sol_neighbor_t1_first_colony: null, // "Alpha Centauri" guaranteed
	sol_neighbor_t1_no_guaranteed_colony: null, // "Alpha Centauri" guaranteed
	sol_neighbor_t2: null, // "Procyon" guaranteed
	sol_neighbor_t2_second_colony: null, // "Sirius" guaranteed
	sol_neighbor_t2_no_guaranteed_colony: null, // "Sirius" guaranteed
	com_sol_system: null, // "Sol" TODO
	ai_sol_system: null, // "Sol" event
	com_sol_neighbor_t1_first_colony: null, // "Alpha Centauri" guaranteed
	com_sol_neighbor_t1: null, // "Barnard's Star" guaranteed
	com_sol_neighbor_t2_second_colony: null, // "Sirius" guaranteed
	lost_colony_sol_system: null, // "Sol" TODO
	lost_colony_sol_neighbor_t1_first_colony: null, // "Alpha Centauri" guaranteed
	lost_colony_sol_neighbor_t1: null, // "Barnard's Star" guaranteed
	lost_colony_sol_neighbor_t2_second_colony: null, // "Sirius" guaranteed
	toxic_knights_sol_start: null, // "Sol" origin
	sol_system_fear_of_the_dark_system: null, // "Sol" origin
	special_init_04: null, // "Sol" TODO
	init_sol_geocentric: null, // "Helios" event
	mindwarden_sol_system_init: null, // "Sol" origin
	mindwarden_sol_buffer_system: null, // "Alpha Centauri" event

	// special_system_initializers.txt
	special_init_01: {
		unique: false,
		name: null,
		description: 'Black Hole',
		dlc: [],
	},
	special_init_06: {
		unique: true,
		name: null,
		description: 'Guardians of Zanaam',
		dlc: [],
	},
	special_init_07: {
		unique: true,
		name: null,
		description: 'Crystal Lair',
		dlc: [],
	},
	special_init_08: {
		unique: false,
		name: null,
		description: 'Neutron Star',
		dlc: [],
	},
	special_init_09: {
		unique: false,
		name: null,
		description: 'Pulsar',
		dlc: [],
	},
	hyacinth_system: null, // event
	ai_system_1: null, // never
	crystal_manufactory_system: {
		unique: true,
		name: null,
		description: 'Ancient Manufactory / Mining Restoration',
		dlc: [],
	},
	trappist_initializer: {
		unique: true,
		name: 'Trappist',
		description: '1 Habitable with 2 Terraforming Candidates',
		dlc: [],
	},
	parvus_system: {
		unique: true,
		name: 'Parvus',
		description: 'Deserted Desert / Nanite Swarm',
		dlc: [],
	},
	polaris_civilization: {
		unique: true,
		name: 'Polaris',
		description: 'Ancient Sunken City / Ancient Seed Vault',
		dlc: [],
	},
	fumongus_init_01: {
		unique: true,
		name: 'Orvall',
		description: 'Fumongus / Mycelium Listening Array',
		dlc: [],
	},
	ghost_ship_system_initializer_01: {
		unique: true,
		name: 'Hillos',
		description: 'Strange Debris / Ghost Ship',
		dlc: [],
	},
	surveillance_supercomputer_system: null, // "Ultima Vigilis" event
	locust_system_initializer_01: {
		unique: true,
		name: 'Ubogleelt',
		description: 'Locust Swarm',
		dlc: [],
	},
	holibrae_initializer: {
		unique: true,
		name: 'Holibrae',
		description: 'Mining Drones with 2 Habitables',
		dlc: [],
	},
	debris_belt_initializer: {
		unique: true,
		name: null,
		description: 'Debris Belt / Crystal of Odryskia',
		dlc: [],
	},
	the_chosen_home_initializer: null, // "Aspharelle" event
	the_chosen_resources_initializer: null, // "Taremes" event
	the_chosen_resources_initializer2: null, // "Ereba" event
	the_chosen_gate_initializer: null, // "Ithome's Gate" event
	the_chosen_escapee_initializer: null, // "Ophalia" event
	the_star_mall_initializer: {
		unique: true,
		name: null,
		description: 'Star Mall',
		dlc: ['Federations', 'Utopia'],
	},
	breachsealer_system: {
		unique: true,
		name: 'Seddom',
		description: 'Universe Breach Detected',
		dlc: [],
	},
	metal_planet_system_initializer: {
		unique: true,
		name: null,
		description: 'Metal Planet',
		dlc: ['Cosmic Storms'],
	},
	previously_terraformed_planet_system_initializer: {
		unique: true,
		name: null,
		description: 'Previously Terraformed Planet',
		dlc: ['Cosmic Storms'],
	},
	collided_planet_system_initializer: {
		unique: true,
		name: null,
		description: 'Collided Planet',
		dlc: ['Cosmic Storms'],
	},
	wooden_planet_system_initializer: {
		unique: true,
		name: null,
		description: 'Arboreal World / Wooden Planet',
		dlc: ['Cosmic Storms'],
	},

	// test_initializers.txt
	// test_init_01: null, // never

	// toxoid_initializers.txt
	toxic_knights_start: null, // origin
	toxic_knights_finish: null, // event

	// unique_system_initializers.txt
	unique_system_initializer_01: {
		unique: true,
		name: "Federation's End",
		description: 'Pre-FTL Habitat Orbiting Black Hole',
		dlc: [],
	},
	unique_system_initializer_02: {
		unique: true,
		name: 'Larionessi Refuge',
		description: 'The Signal',
		dlc: [],
	},
	unique_system_initializer_03: {
		unique: true,
		name: 'Zevox',
		description: 'The Crashed Ship / Zero One Zero Two',
		dlc: [],
	},
	unique_system_initializer_04: {
		unique: true,
		name: "Fehnrax's Stand",
		description: 'Ancient Battlefield',
		dlc: [],
	},
	unique_system_initializer_05: {
		unique: true,
		name: "Zhanrox's Rest",
		description: 'Ancient Battlefield',
		dlc: [],
	},
	unique_system_initializer_06: {
		unique: true,
		name: 'Afari',
		description: 'Ancient Battlefield',
		dlc: [],
	},
	unique_system_initializer_07: {
		unique: true,
		name: "Tragula's Cross",
		description: '3 Habitable Planets',
		dlc: [],
	},
	unique_system_initializer_08: {
		unique: true,
		name: "Trin's Promise",
		description: '3 Habitable Planets',
		dlc: [],
	},
	unique_system_initializer_09: {
		unique: true,
		name: 'Loh',
		description: '3 Habitable Planets',
		dlc: [],
	},
	lone_defender: {
		unique: true,
		name: 'Xraneax',
		description: 'Lone Defender / Mutually Assured Destruction',
		dlc: [],
	},

	// unplugged_initializers.txt
	origin_unplugged_starting_system_init: null, // origin
	sol_system_unplugged_initializer: null, // "Sol" origin
	origin_unplugged_machine_legacy_core_system_init: null, // event
	origin_unplugged_machine_legacy_periphery_system_init: null, // event
	unplugged_machine_legacy_tomb_1_system_init: null, // event
	unplugged_machine_legacy_tomb_2_system_init: null, // event
	unplugged_machine_legacy_tomb_3_system_init: null, // event
	unplugged_machine_legacy_tomb_4_system_init: null, // event

	// utopia_initializers.txt
	dyson_sphere_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Dyson Sphere',
		dlc: ['Utopia'],
	},
	science_nexus_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Science Nexus',
		dlc: ['Utopia'],
	},
	sentry_array_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Sentry Array',
		dlc: ['Utopia'],
	},
	ring_world_init_01: {
		unique: true,
		name: null,
		description: 'Ruined Ringworld / Murky Vats / Clones in Cryostasis',
		dlc: ['Utopia'],
	},

	// zroni_legacy_initializers.txt
	zroni_legacy_initializer_01: null, // "Tarentei" event
	zroni_legacy_initializer_02: null, // "Jarani" event
	zroni_legacy_initializer_03: null, // "Oren" event
};
