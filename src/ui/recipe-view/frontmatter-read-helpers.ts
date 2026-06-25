/**
 * Lightweight frontmatter accessor helpers used within the recipe view to
 * extract typed string, number, and nutrient values from raw frontmatter maps.
 */
type FM = Record<string, unknown>;

export function fmStr(fm: FM, keys: string[]): string | null {
	for (const key of keys) {
		const v = fm[key];
		if (typeof v === "string" && v.trim()) return v.trim();
	}
	return null;
}

export function fmNum(fm: FM, keys: string[]): number | null {
	for (const key of keys) {
		const v = fm[key];
		if (typeof v === "number" && isFinite(v)) return v;
		if (typeof v === "string") {
			const n = parseFloat(v);
			if (isFinite(n)) return n;
		}
	}
	return null;
}

// Checks the flat frontmatter first; falls back to a nested `nutrition: {}` sub-object.
export function fmNutrient(fm: FM, keys: string[]): number | null {
	const flat = fmNum(fm, keys);
	if (flat !== null) return flat;
	const nested = fm["nutrition"];
	if (nested && typeof nested === "object" && !Array.isArray(nested)) {
		return fmNum(nested as FM, keys);
	}
	return null;
}
