/**
 * Removes the YAML frontmatter block from raw note content, returning the body text only.
 */
export function stripFrontmatter(contents: string): string {
	if (!contents.startsWith("---")) return contents;
	const closeIdx = contents.indexOf("\n---", 3);
	if (closeIdx < 0) return contents; // no closing delimiter — return unchanged
	const afterDelimiter = contents.slice(closeIdx + 4); // skip \n---
	return afterDelimiter.startsWith("\n") ? afterDelimiter.slice(1) : afterDelimiter;
}
