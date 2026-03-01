import { CANVAS_BACKGROUND, CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';

type StrokeConfig = {
	size: number;
	blur: number;
	color: string;
	opacity: number;
};

export function draw_stroke(
	ctx: CanvasRenderingContext2D,
	path: string,
	config: StrokeConfig,
) {
	if (!ctx) return;
	const p = new Path2D(path);
	ctx.globalAlpha = config.opacity;
	ctx.filter = `blur(${config.size * config.blur}px)`;
	ctx.fillStyle = config.color === CANVAS_BACKGROUND ? '#000000' : '#FFFFFF';
	ctx.fill(p);
	ctx.globalAlpha = 1;
	ctx.filter = 'blur(0px)';
}

export async function normalize_image(file: File): Promise<Blob> {
	const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	const ctx = canvas.getContext('2d');
	if (ctx === null) throw new Error('null ctx');
	ctx.filter = 'grayscale(1)';
	ctx.drawImage(
		await createImageBitmap(file),
		0,
		0,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
	);
	const blob = await canvas.convertToBlob({
		type: 'image/jpeg',
		quality: 1,
	});
	return blob;
}

export function make_blank_image(): Promise<Blob> {
	const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	// see https://issues.chromium.org/issues/428407023
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Chrome requires ctx for convertToBlob to work
	const ctx = canvas.getContext('2d');
	return canvas.convertToBlob({
		type: 'image/png',
		quality: 1,
	});
}

export async function convert_blob_to_image_data(blob: Blob) {
	const canvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	const ctx = canvas.getContext('2d');
	if (ctx === null) throw new Error('null ctx');
	ctx.filter = 'grayscale(1)';
	ctx.drawImage(
		await createImageBitmap(blob),
		0,
		0,
		CANVAS_WIDTH,
		CANVAS_HEIGHT,
	);
	return ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
