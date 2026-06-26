/**
 * Filter expression shapes for the generic recipe filtering engine.
 * Tags are encoded as pseudo-fields with a "#" prefix (e.g. "#vegetarian").
 */

/** Inferred data type for a discovered frontmatter field. */
export type FieldType = "number" | "date" | "boolean" | "string";

/** Tags form their own pseudo-type separate from the four inferred types. */
export type FilterableType = FieldType | "tag";

/** Valid operators for each filterable type, with display labels. */
export const OPERATORS: Record<FilterableType, readonly { id: string; label: string }[]> = {
	number: [
		{ id: "eq", label: "equals" },
		{ id: "gt", label: "greater than" },
		{ id: "lt", label: "less than" },
		{ id: "between", label: "between" },
	],
	date: [
		{ id: "eq", label: "is on" },
		{ id: "before", label: "before" },
		{ id: "after", label: "after" },
		{ id: "within-last", label: "within last N days" },
		{ id: "between", label: "between" },
	],
	boolean: [
		{ id: "is-true", label: "is true" },
		{ id: "is-false", label: "is false" },
	],
	string: [
		{ id: "eq", label: "equals" },
		{ id: "contains", label: "contains" },
		{ id: "one-of", label: "is one of" },
	],
	tag: [
		{ id: "has", label: "has tag" },
		{ id: "not-has", label: "doesn't have tag" },
	],
};

/**
 * A single filter expression. Value shape depends on operator:
 * - "between": [lo, hi] pair (numbers or ISO date strings)
 * - "one-of": string[]
 * - "within-last": number (days)
 * - "is-true", "is-false", "has", "not-has": value unused (pass undefined)
 * - all others: scalar matching the field's inferred type
 */
export interface FieldFilter {
	field: string;    // frontmatter key, or "#tagname" for tag pseudo-fields
	operator: string; // one of the ids from OPERATORS
	value: unknown;   // shape depends on operator
}

/** All filters are ANDed: a recipe must pass every filter. */
export type FilterSet = FieldFilter[];
