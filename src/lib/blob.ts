export async function convert_data_url_to_blob(url: string): Promise<Blob> {
	const response = await fetch(url);
	return await response.blob();
}

export function convert_blob_to_data_url(blob: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const file_reader = new FileReader();
		file_reader.addEventListener(
			'load',
			() => {
				if (typeof file_reader.result === 'string') {
					resolve(file_reader.result);
				} else {
					reject(new Error('Load result is not string.'));
				}
			},
			{ once: true },
		);
		file_reader.readAsDataURL(blob);
	});
}

export function download_blob(blob: Blob, file_name: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = file_name;
	a.click();
	URL.revokeObjectURL(url);
}
