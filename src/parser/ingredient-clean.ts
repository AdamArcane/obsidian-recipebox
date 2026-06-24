export function stripListMarkers(line: string): string {
	let prev = "";
	let cur = line;
	while (cur !== prev) {
		prev = cur;
		cur = cur
			.replace(/^\s*[-*+]\s+/, "")
			.replace(/^\s*\d+\.\s+/, "")
			.replace(/^\s*\[[ x?]\]\s*/i, "");
	}
	return cur.trim();
}

// Matches one level of nesting: (text) or (text (nested) text).
// Also consumes flanking * or _ so e.g. *(text)* and (text)* don't leave stray chars.
const NOTE_RE = /[*_]*\(([^()]*(?:\([^()]*\)[^()]*)*)\)[*_]*/g;

// Strips one layer of surrounding parens when the entire content is itself wrapped: (text) → text
function unwrapNote(inner: string): string {
	const t = inner.trim();
	return t.startsWith("(") && t.endsWith(")") ? t.slice(1, -1).trim() : t;
}

// Extracts all parenthesised groups from anywhere in the line.
// Must run after stripMarkdownEmphasis so *(text)* has already become (text).
export function extractInlineNotes(text: string): { cleaned: string; note: string | null } {
	const notes: string[] = [];
	const cleaned = text
		.replace(NOTE_RE, (_, inner: string) => {
			const unwrapped = unwrapNote(inner);
			if (unwrapped) notes.push(unwrapped);
			return "";
		})
		.replace(/[()]/g, "")  // strip any remaining orphaned parens
		.replace(/\s{2,}/g, " ")
		.trim();
	return { cleaned, note: notes.length > 0 ? notes.join(", ") : null };
}

export function extractTrailingTags(text: string): { cleaned: string; tags: string[] } {
	const tagPattern = /(?:\s+#[\w/-]+)+$/;
	const match = text.match(tagPattern);
	if (!match) return { cleaned: text, tags: [] };
	const tags = match[0].trim().split(/\s+/).map((t) => t.slice(1));
	return { cleaned: text.slice(0, text.length - match[0].length).trim(), tags };
}

export function stripMarkdownEmphasis(text: string): string {
	return text
		.replace(/\*{2,3}|_{2,}/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

export function stripOf(text: string): string {
	return text.replace(/^of\s+/i, "");
}

export function normaliseName(name: string): string {
	return name
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/^[-–—]+|[-–—]+$/g, "")
		.trim();
}

export function ingredientKey(name: string, unit: string): string {
	return `${normaliseName(name)}|${unit.toLowerCase()}`;
}

export function hasIgnoreTag(tags: string[]): boolean {
	return tags.some(
		(t) => t.toLowerCase().replace(/[-_]/g, "") === "ignoreingredient"
	);
}
