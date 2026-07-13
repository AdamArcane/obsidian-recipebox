/**
 * Reads a recipe's source URL from frontmatter, if any. Reuses the same ad
 * hoc candidate-key list mobile-layout.ts already uses for this -- not a
 * new configurable setting, since the codebase doesn't already treat this
 * as one.
 */
export function findSourceUrl(frontmatter: Record<string, unknown>): string | null {
	for (const key of ["source", "url", "sourceUrl", "source_url"]) {
		const value = frontmatter[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return null;
}
