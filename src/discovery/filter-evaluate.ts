/**
 * Evaluates whether a recipe matches a given filter set.
 * All filters are ANDed. A recipe missing a field entirely fails any filter
 * on that field -- there is no special "missing field" mode in this version.
 */
import { findValue } from "../parser/frontmatter-lookup";
import { FieldFilter, FilterSet } from "./filter-types";

const TAG_PREFIX = "#";

function isTagFilter(field: string): boolean {
	return field.startsWith(TAG_PREFIX);
}

function coerceDate(val: unknown): Date | null {
	if (typeof val !== "string") return null;
	const d = new Date(val);
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
	const value = findValue(meta, [filter.field]);
	if (value === undefined || value === null) return false;

	switch (filter.operator) {
		case "eq":
			if (typeof value === "number") return value === (filter.value as number);
			if (typeof value === "boolean") return value === filter.value;
			if (typeof value === "string") {
				return value.toLowerCase() === (filter.value as string).toLowerCase();
			}
			return false;

		case "gt": return typeof value === "number" && value > (filter.value as number);
		case "lt": return typeof value === "number" && value < (filter.value as number);

		case "between": {
			const [lo, hi] = filter.value as [unknown, unknown];
			if (typeof value === "number") {
				return value >= (lo as number) && value <= (hi as number);
			}
			const d = coerceDate(value);
			const dLo = coerceDate(lo);
			const dHi = coerceDate(hi);
			return !!d && !!dLo && !!dHi && d >= dLo && d <= dHi;
		}

		case "before": {
			const d = coerceDate(value);
			const threshold = coerceDate(filter.value);
			return !!d && !!threshold && d < threshold;
		}

		case "after": {
			const d = coerceDate(value);
			const threshold = coerceDate(filter.value);
			return !!d && !!threshold && d > threshold;
		}

		case "within-last": {
			const d = coerceDate(value);
			if (!d) return false;
			const days = filter.value as number;
			const cutoff = new Date(Date.now() - days * 86400000);
			return d >= cutoff;
		}

		case "is-true": return value === true;
		case "is-false": return value === false;

		case "contains":
			return typeof value === "string"
				&& value.toLowerCase().includes((filter.value as string).toLowerCase());

		case "one-of": {
			if (typeof value !== "string") return false;
			const lower = value.toLowerCase();
			return (filter.value as string[]).some(o => o.toLowerCase() === lower);
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
