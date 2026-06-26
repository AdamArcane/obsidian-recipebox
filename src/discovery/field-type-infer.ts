/**
 * Infers the data type of a frontmatter field from its observed values.
 * Uses majority voting across all samples; string wins all ties since it is
 * always a safe fallback that degrades gracefully to equals/contains operators.
 */
import { FieldType } from "./filter-types";

/** Classify a single value into one of the four inferred types. */
function classifyValue(val: unknown): FieldType {
	if (typeof val === "boolean") return "boolean";
	if (typeof val === "number") return "number";
	// Treat strings that open with an ISO date segment as dates.
	if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return "date";
	return "string";
}

export function inferFieldType(values: Iterable<unknown>): FieldType {
	const counts: Record<FieldType, number> = { number: 0, date: 0, boolean: 0, string: 0 };
	for (const val of values) counts[classifyValue(val)]++;

	let topType: FieldType = "string";
	let topCount = 0;
	let tied = false;

	for (const type of (["number", "date", "boolean", "string"] as const)) {
		const count = counts[type];
		if (count > topCount) {
			topType = type;
			topCount = count;
			tied = false;
		} else if (count === topCount && topCount > 0) {
			tied = true;
		}
	}

	return tied ? "string" : topType;
}
