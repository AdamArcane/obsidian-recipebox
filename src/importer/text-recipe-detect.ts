/**
 * Regular expressions and helpers for recognising "Ingredients" and "Instructions"
 * section headings in free-form recipe text, used by text-recipe-parse.ts.
 */
// Optional markdown heading prefix followed by the keyword
const HEAD_PREFIX = "(?:#{1,6}\\s+)?";

export const INGREDIENTS_SECTION_RE = new RegExp(
	`^${HEAD_PREFIX}(?:ingredients?|what\\s+you(?:'ll|\\s+will)?\\s+need)\\s*:?\\s*$`,
	"i",
);

export const INSTRUCTIONS_SECTION_RE = new RegExp(
	`^${HEAD_PREFIX}(?:instructions?|directions?|method|steps?|how\\s+to\\s+make|preparation)\\s*:?\\s*$`,
	"i",
);

// A line looks like a section keyword if it matches either boundary pattern
export function isSectionKeyword(line: string): boolean {
	return INGREDIENTS_SECTION_RE.test(line) || INSTRUCTIONS_SECTION_RE.test(line);
}
