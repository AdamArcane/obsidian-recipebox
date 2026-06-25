/**
 * Converts a recipe title to a safe vault filename by stripping characters
 * that Obsidian and common filesystems disallow.
 */
const UNSAFE_CHARS_RE = /[\\/:*?"<>|#[\]]/g;
const WHITESPACE_RUN_RE = /\s+/g;
const FALLBACK_FILENAME = "Untitled Recipe";

export function titleToFilename(title: string): string {
	const sanitized = title
		.replace(UNSAFE_CHARS_RE, "")
		.replace(WHITESPACE_RUN_RE, " ")
		.trim();
	return sanitized || FALLBACK_FILENAME;
}
