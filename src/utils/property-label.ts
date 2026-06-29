/** Converts a frontmatter property key in any common casing to a human-readable label. */
export function propertyToLabel(key: string): string {
	return key
		.replace(/([a-z])([A-Z])/g, "$1 $2")       // camelCase → camel Case
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // ABCDef → ABC Def
		.replace(/[_\-.]+/g, " ")                    // snake_case / kebab-case / dot.case
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());
}
