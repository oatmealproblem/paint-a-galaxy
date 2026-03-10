import type { Attachment } from 'svelte/attachments';

export const debounced_value =
	(
		get_value: () => string,
		set_value: (value: string) => void,
		ms: number,
	): Attachment<HTMLInputElement> =>
	(input) => {
		input.value = get_value();

		let timeout: ReturnType<typeof setTimeout> | null = null;
		let pending_value: string | null = null;

		const listener = () => {
			if (timeout != null) clearTimeout(timeout);
			timeout = setTimeout(() => {
				set_value(input.value);
				timeout = null;
				pending_value = null;
			}, ms);
			pending_value = input.value;
		};
		input.addEventListener('change', listener);

		return () => {
			if (timeout != null) clearTimeout(timeout);
			if (pending_value != null) set_value(pending_value);
			input.removeEventListener('change', listener);
		};
	};
