const LOCALSTORAGE_PREFIX = 'paint-a-galaxy';

export class LocalStorageState<T> {
	#key: string;
	#current: T = $state()!;

	constructor(key: string, default_value: T) {
		this.#key = `${LOCALSTORAGE_PREFIX}-${key}`;
		const unparsed = localStorage.getItem(this.#key);
		if (unparsed) {
			this.#current = JSON.parse(unparsed);
		} else {
			this.#current = default_value;
		}

		$effect(() => {
			localStorage.setItem(this.#key, JSON.stringify(this.#current));
		});
	}

	get current(): T {
		return this.#current;
	}

	set current(value: T) {
		this.#current = value;
	}
}
