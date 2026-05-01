export function tokenize(gameState: string): string[] {
	const tokens: string[] = [];
	let token: string | null = null;
	let quote_open = false;
	let comment = false;
	for (const char of gameState) {
		if (comment) {
			if (char === '\n') {
				comment = false;
			}
		} else if (token != null && quote_open) {
			token = token.concat(char);
			if (char === '"' && token.at(-2) !== '\\') {
				tokens.push(token.slice(1, -1)); // don't include the quotes
				token = null;
				quote_open = false;
			}
		} else if (char === '#') {
			if (token != null) tokens.push(token);
			token = null;
			comment = true;
		} else if (char.match(/\s/)) {
			if (token != null) tokens.push(token);
			token = null;
		} else if (char === '{' || char === '}' || char === '=') {
			if (token != null) tokens.push(token);
			token = null;
			tokens.push(char);
		} else if (char === '"') {
			token = char;
			quote_open = true;
		} else {
			if (token != null) {
				token = token.concat(char);
			} else {
				token = char;
			}
		}
	}
	return tokens;
}

type Entry = [string, string | Entry[]];

export function parse_entries(tokens: string[]): Entry[] {
	const entries: Entry[] = [];
	const stack: Entry[][] = [];
	let current = entries;
	let key: string | null = null;
	let assigning = false;
	for (const token of tokens) {
		if (token === '{') {
			if (assigning) {
				const new_entries: Entry[] = [];
				current.push([key ?? '', new_entries]);
				stack.push(current);
				current = new_entries;
				key = null;
				assigning = false;
			} else {
				if (key != null) {
					// this key is actually an array value
					current.push(['', key]);
					key = null;
				}
				const new_entries: Entry[] = [];
				current.push(['', new_entries]);
				stack.push(current);
				current = new_entries;
			}
		} else if (token === '}') {
			if (key != null) {
				// this key is actually an array value
				current.push(['', key]);
			}
			current = stack.pop() ?? entries;
		} else if (token === '=') {
			if (assigning) {
				current.push([key ?? '', '']);
				key = '';
			} else {
				assigning = true;
			}
		} else {
			if (assigning && key != null) {
				current.push([key, token]);
				key = null;
				assigning = false;
			} else if (key != null) {
				// this key is actually an array value
				current.push(['', key]);
				key = token;
			} else {
				key = token;
			}
		}
	}
	return entries;
}

export function find_text_entry(entries: Entry[], key: string): string {
	const entry = entries.find((entry) => entry[0] === key);
	const value = entry?.[1];
	if (typeof value === 'string') {
		return value;
	} else {
		return '';
	}
}

export function find_number_entry(
	entries: Entry[],
	key: string,
	{ int = false } = {},
): number {
	const entry = entries.find((entry) => entry[0] === key);
	const value = entry?.[1];
	if (typeof value === 'string') {
		const parsed = (int ? Number.parseInt : Number.parseFloat)(value);
		if (Number.isNaN(parsed)) {
			return 0;
		} else {
			return parsed;
		}
	} else if (Array.isArray(value)) {
		// handle min/max objects (as mid value)
		return (
			find_number_entry(value, 'min') / 2 + find_number_entry(value, 'max') / 2
		);
	} else {
		return 0;
	}
}

export function find_object_entry(entries: Entry[], key: string): Entry[] {
	const entry = entries.find((entry) => entry[0] === key);
	const value = entry?.[1];
	if (Array.isArray(value)) {
		return value;
	} else {
		return [];
	}
}

export function filter_object_entries(
	entries: Entry[],
	key: string,
): Entry[][] {
	return entries
		.filter(
			(entry): entry is [string, Entry[]] =>
				entry[0] === key && Array.isArray(entry[1]),
		)
		.map((entry) => entry[1]);
}
