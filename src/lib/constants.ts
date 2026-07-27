// canvas size (the html <canvas>, the overlayed <svg>, and the Stellaris map)
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1000;
export const CANVAS_BACKGROUND = '#000000';

export const DETAILS_DEFAULT_WIDTH = 320;
export const DETAILS_DEFAULT_HEIGHT = 368;

// size of each "arm" of the plus sign marking the center of the canvas
export const CENTER_MARK_SIZE = 10;
// various "guide" zones
export const GIGA_RANDOM_CORE_RADIUS = 100;
export const GIGA_AETERNUM_CORE_RADIUS = 65;
export const L_CLUSTER_RADIUS = 70;
export const L_CLUSTER_CX = CANVAS_WIDTH / 2 + 420;
export const L_CLUSTER_CY = CANVAS_HEIGHT / 2 - 420;
// search for empty circles to dynamically spawn FEs on game start
export const FALLEN_EMPIRE_ZONE_RADIUS = 30;
export const FALLEN_EMPIRE_ZONE_DEFAULT_DISTANCE = 40;
export const FALLEN_EMPIRE_ZONE_DISTANCES = [
	30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
	200,
] as const;
export const FALLEN_EMPIRE_ZONE_ANGLES = [
	0, 45, 90, 135, 180, 225, 270, 315,
] as const;
// number of nebulas to generate when randomizing
export const NUM_RANDOM_NEBULAS = 6;
// min and max radius of random nebulas
export const RANDOM_NEBULA_MIN_RADIUS = 40;
export const RANDOM_NEBULA_MAX_RADIUS = 60;
// minimum distance between random nebulas (center to center)
export const RANDOM_NEBULA_MIN_DISTANCE = 150;

export const ID = {
	new_project_dialog: 'new_project_dialog',
	delete_project_dialog: 'delete_project_dialog',
	rename_project_dialog: 'rename_project_dialog',
	clone_project_dialog: 'clone_project_dialog',
	import_project_dialog: 'import_project_dialog',
	upload_image_dialog: 'upload_image_dialog',
	configure_grid_dialog: 'configure_grid_dialog',
	canvas: 'canvas',
} as const;

export const CUSTOM_COMMAND = {
	reset_zoom: '--reset-zoom',
	set_zoom_050: '--set-zoom-050',
	set_zoom_075: '--set-zoom-075',
	set_zoom_100: '--set-zoom-100',
	set_zoom_150: '--set-zoom-150',
	set_zoom_200: '--set-zoom-200',
	set_zoom_400: '--set-zoom-400',
	set_zoom_800: '--set-zoom-800',
} as const;
