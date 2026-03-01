// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Uint8Array<TArrayBuffer extends ArrayBufferLike> {
	/**
	 * Converts the `Uint8Array` to a base64-encoded string.
	 * @param options If provided, sets the alphabet and padding behavior used.
	 * @returns A base64-encoded string.
	 */
	toBase64(options?: {
		alphabet?: 'base64' | 'base64url' | undefined;
		omitPadding?: boolean | undefined;
	}): string;
}
