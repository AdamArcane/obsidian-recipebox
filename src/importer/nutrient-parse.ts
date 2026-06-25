/**
 * Extracts the leading numeric value from a nutrient string such as "12.5g" or "300 kcal".
 */
const LEADING_NUMBER_RE = /\d+(?:\.\d+)?/;

export function parseNutrient(value: string): number | null {
	const m = value.match(LEADING_NUMBER_RE);
	if (!m) return null;
	const n = Number(m[0]);
	return isFinite(n) ? Math.round(n) : null;
}
