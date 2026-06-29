/**
 * Evaluates whether a recipe matches a given filter set.
 * All filters are ANDed. A recipe missing a field entirely fails any filter
 * on that field -- there is no special "missing field" mode in this version.
 *
 * Array-valued fields (e.g. cuisine: [Italian, French]) are handled by checking
 * whether *any* element in the array satisfies the operator. String values
 * wrapped in wikilink syntax ([[Title]]) are stripped before comparison.
 */
import { findValue } from "../parser/frontmatter-lookup";
import { stripWikilink } from "../utils/wikilink-strip";
import { FieldFilter, FilterSet } from "./filter-types";

const TAG_PREFIX = "#";

function isTagFilter(field: string): boolean {
	return field.startsWith(TAG_PREFIX);
}

/** Strips wikilink brackets from a string, returns null for non-strings. */
function asStr(val: unknown): string | null {
	if (typeof val !== "string") return null;
	return stripWikilink(val);
}

/**
 * Normalizes a field value into an array of scalars so operator logic doesn't
 * need separate array/scalar branches. Wikilinks in string elements are stripped.
 */
function flatten(val: unknown): unknown[] {
	if (!Array.isArray(val)) return [val];
	return (val as unknown[]).map(v => (typeof v === "string" ? stripWikilink(v) : v));
}

function coerceDate(val: unknown): Date | null {
	const s = asStr(val);
	if (!s) return null;
	const d = new Date(s);
	return isNaN(d.getTime()) ? null : d;
}

function evaluateFilter(
	meta: Record<string, unknown>,
	tags: string[],
	filter: FieldFilter,
): boolean {
	// Tag pseudo-fields: just test presence in the recipe's tag list.
	if (isTagFilter(filter.field)) {
		const name = filter.field.slice(TAG_PREFIX.length);
		const has = tags.includes(name);
		if (filter.operator === "has") return has;
		if (filter.operator === "not-has") return !has;
		return false;
	}

	// Use the alias-aware lookup so settings-configured field names resolve
	// correctly even if the recipe uses a recognized alternate spelling.
	const raw = findValue(meta, [filter.field]);
	if (raw === undefined || raw === null) {
		// "not-within-last" is the one operator where a missing field passes --
		// a recipe never made is definitionally not "made recently."
		return filter.operator === "not-within-last";
	}

	// Flatten to array so every operator can use .some() without branching.
	const values = flatten(raw);

	switch (filter.operator) {
		case "eq":
			return values.some(v => {
				if (typeof v === "number") return v === (filter.value as number);
				if (typeof v === "boolean") return v === filter.value;
				const s = asStr(v);
				return s !== null && s.toLowerCase() === (filter.value as string).toLowerCase();
			});

		case "gt": return values.some(v => typeof v === "number" && v > (filter.value as number));
		case "lt": return values.some(v => typeof v === "number" && v < (filter.value as number));

		case "between": {
			const [lo, hi] = filter.value as [unknown, unknown];
			return values.some(v => {
				if (typeof v === "number") return v >= (lo as number) && v <= (hi as number);
				const d = coerceDate(v);
				const dLo = coerceDate(lo);
				const dHi = coerceDate(hi);
				return !!d && !!dLo && !!dHi && d >= dLo && d <= dHi;
			});
		}

		case "before":
			return values.some(v => {
				const d = coerceDate(v);
				const threshold = coerceDate(filter.value);
				return !!d && !!threshold && d < threshold;
			});

		case "after":
			return values.some(v => {
				const d = coerceDate(v);
				const threshold = coerceDate(filter.value);
				return !!d && !!threshold && d > threshold;
			});

		case "within-last":
			return values.some(v => {
				const d = coerceDate(v);
				if (!d) return false;
				const cutoff = new Date(Date.now() - (filter.value as number) * 86400000);
				return d >= cutoff;
			});

		case "not-within-last": {
			// A missing field (handled above) passes. If present, no element may be recent.
			const cutoff = new Date(Date.now() - (filter.value as number) * 86400000);
			return values.every(v => {
				const d = coerceDate(v);
				return !d || d < cutoff;
			});
		}

		case "is-true":  return values.some(v => v === true);
		case "is-false": return values.some(v => v === false);

		case "contains":
			return values.some(v => {
				const s = asStr(v);
				return s !== null && s.toLowerCase().includes((filter.value as string).toLowerCase());
			});

		case "one-of": {
			const options = (filter.value as string[]).map(o => o.toLowerCase());
			return values.some(v => {
				const s = asStr(v);
				return s !== null && options.includes(s.toLowerCase());
			});
		}

		default:
			return false;
	}
}

/**
 * Returns true only if the recipe passes every filter in the set.
 *
 * @param meta    The recipe's frontmatter (from metadataCache).
 * @param tags    The recipe's tags without the leading "#".
 * @param filters Filters to apply; empty set matches everything.
 */
export function matchesFilters(
	meta: Record<string, unknown>,
	tags: string[],
	filters: FilterSet,
): boolean {
	return filters.every(f => evaluateFilter(meta, tags, f));
}
