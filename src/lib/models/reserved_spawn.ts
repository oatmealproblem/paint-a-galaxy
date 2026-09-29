// Reserved spawns are named after the latin letters, then the lowercase greek
// alphabet, so a map can reserve more spawns without any uppercase greek
// homoglyphs colliding with the latin letters.
const LATIN_RESERVED_SPAWN_SUFFIXES = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z',
] as const;

const GREEK_RESERVED_SPAWN_SUFFIXES = [
	'alpha',
	'beta',
	'gamma',
	'delta',
	'epsilon',
	'zeta',
	'eta',
	'theta',
	'iota',
	'kappa',
	'lambda',
	'mu',
	'nu',
	'xi',
	'omicron',
	'pi',
	'rho',
	'sigma',
	'tau',
	'upsilon',
	'phi',
	'chi',
	'psi',
	'omega',
] as const;

type GreekReservedSpawnSuffix = (typeof GREEK_RESERVED_SPAWN_SUFFIXES)[number];

const RESERVED_SPAWN_SUFFIXES = [
	...LATIN_RESERVED_SPAWN_SUFFIXES,
	...GREEK_RESERVED_SPAWN_SUFFIXES,
	'sol',
] as const;

type ReservedSpawnType = `reserved_${(typeof RESERVED_SPAWN_SUFFIXES)[number]}`;

export const RESERVED_SPAWN_TYPES = RESERVED_SPAWN_SUFFIXES.map(
	(suffix) => `reserved_${suffix}` as ReservedSpawnType,
);

const GREEK_RESERVED_SPAWN_SYMBOLS: Record<GreekReservedSpawnSuffix, string> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	zeta: 'ζ',
	eta: 'η',
	theta: 'θ',
	iota: 'ι',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	xi: 'ξ',
	omicron: 'ο',
	pi: 'π',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	upsilon: 'υ',
	phi: 'φ',
	chi: 'χ',
	psi: 'ψ',
	omega: 'ω',
};

export function get_reserved_spawn_symbol(spawn_type: string): string | null {
	if (spawn_type === 'reserved_sol') return '♁';
	const suffix = spawn_type.slice('reserved_'.length);
	const greek =
		GREEK_RESERVED_SPAWN_SYMBOLS[suffix as GreekReservedSpawnSuffix];
	if (greek != null) return greek;
	return suffix.length === 1 ? suffix.toUpperCase() : null;
}

export function get_reserved_spawn_label(spawn_type: string): string {
	const suffix = spawn_type.slice('reserved_'.length);
	return suffix.length === 1 ?
			suffix.toUpperCase()
		:	suffix.charAt(0).toUpperCase() + suffix.slice(1);
}
