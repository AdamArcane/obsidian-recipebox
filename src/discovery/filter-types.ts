/**
 * Filter expression shapes for the generic recipe filtering engine.
 * Tags are encoded as pseudo-fields with a "#" prefix (e.g. "#vegetarian").
 */
import { t as translateUi } from "../i18n";

// FieldFilter lives in types.ts so that strategy-types.ts can import it without
// creating a transitive back-edge from discovery-cache.ts into this directory.
import type { FieldFilter } from "../suggester/strategy-types";
export type { FieldFilter };

/** Inferred data type for a discovered frontmatter field. */
export type FieldType = "number" | "date" | "boolean" | "string";

/** Tags form their own pseudo-type separate from the four inferred types. */
export type FilterableType = FieldType | "tag";

/** Valid operators for each filterable type, with display labels. */
export const OPERATORS: Record<FilterableType, readonly { id: string; label: string }[]> = {
	number: [
		{ id: "eq", label: translateUi("equals") },
		{ id: "gt", label: translateUi("greater than") },
		{ id: "lt", label: translateUi("less than") },
		{ id: "between", label: translateUi("between") },
	],
	date: [
		{ id: "eq", label: translateUi("is on") },
		{ id: "before", label: translateUi("before") },
		{ id: "after", label: translateUi("after") },
		{ id: "within-last", label: translateUi("within last N days") },
		{ id: "not-within-last", label: translateUi("not within last N days") },
		{ id: "between", label: translateUi("between") },
	],
	boolean: [
		{ id: "is-true", label: translateUi("is true") },
		{ id: "is-false", label: translateUi("is false") },
	],
	string: [
		{ id: "eq", label: translateUi("equals") },
		{ id: "contains", label: translateUi("contains") },
		{ id: "one-of", label: translateUi("is one of") },
	],
	tag: [
		{ id: "has", label: translateUi("has tag") },
		{ id: "not-has", label: translateUi("doesn't have tag") },
	],
};

/** All filters are ANDed: a recipe must pass every filter. */
export type FilterSet = FieldFilter[];
