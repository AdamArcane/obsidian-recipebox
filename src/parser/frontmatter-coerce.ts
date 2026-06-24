export function toTagArray(value: unknown): string[] {
	let items: unknown[];
	if (Array.isArray(value)) {
		items = value;
	} else if (typeof value === "string") {
		items = value.split(/[,;]/);
	} else {
		return [];
	}
	const seen = new Set<string>();
	const result: string[] = [];
	for (const item of items) {
		const s = String(item).trim().toLowerCase();
		if (s && !seen.has(s)) {
			seen.add(s);
			result.push(s);
		}
	}
	return result;
}

const NUMBER_SUBSTR_RE = /-?\d+(?:\.\d+)?/;

export function toNumber(value: unknown): number | null {
	if (typeof value === "number") return isFinite(value) ? value : null;
	if (typeof value === "string") {
		const m = value.match(NUMBER_SUBSTR_RE);
		if (m) {
			const n = Number(m[0]);
			return isFinite(n) ? n : null;
		}
	}
	return null;
}

export function toBoolean(value: unknown): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value === "string") {
		const s = value.trim().toLowerCase();
		return s === "true" || s === "yes" || s === "1";
	}
	return false;
}
