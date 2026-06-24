const LEADING_NUMBER_RE = /\d+(?:\.\d+)?/;

export function parseNutrient(value: string): number | null {
	const m = value.match(LEADING_NUMBER_RE);
	if (!m) return null;
	const n = Number(m[0]);
	return isFinite(n) ? Math.round(n) : null;
}
