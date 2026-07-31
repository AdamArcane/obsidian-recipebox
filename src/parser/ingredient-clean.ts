/**
 * Low-level text-cleaning utilities for ingredient lines — strips list markers,
 * extracts parenthesised notes and trailing tags, normalises names, and generates
 * deduplication keys. Used by ingredient-parse.ts and the grocery pipeline.
 */
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

// A markdown link is masked before notes are extracted, because its destination
// is not an aside: reading "(sauce.md)" as a note left a dangling "[name]", and
// the orphaned-paren sweep below would otherwise glue the bare destination on.
const INLINE_LINK_RE = /\[[^\]]*\]\([^)]*\)/g;

// Strips one layer of surrounding parens when the entire content is itself wrapped: (text) → text
function unwrapNote(inner: string): string {
	const t = inner.trim();
	return t.startsWith("(") && t.endsWith(")") ? t.slice(1, -1).trim() : t;
}

// Extracts all parenthesised groups from anywhere in the line.
// Must run after stripMarkdownEmphasis so *(text)* has already become (text).
export function extractInlineNotes(text: string): { cleaned: string; note: string | null } {
	const notes: string[] = [];

	const scrub = (segment: string): string =>
		segment
			.replace(NOTE_RE, (_, inner: string) => {
				const unwrapped = unwrapNote(inner);
				if (unwrapped) notes.push(unwrapped);
				return "";
			})
			.replace(/[()]/g, ""); // strip any remaining orphaned parens

	// Links are copied through untouched. Their destination is not an aside, and
	// scrubbing it left a dangling "[name]" with the bare destination glued on.
	const parts: string[] = [];
	let last = 0;
	INLINE_LINK_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = INLINE_LINK_RE.exec(text)) !== null) {
		parts.push(scrub(text.slice(last, match.index)), match[0]);
		last = match.index + match[0].length;
	}
	parts.push(scrub(text.slice(last)));

	const cleaned = parts.join("").replace(/\s{2,}/g, " ").trim();
	return { cleaned, note: notes.length > 0 ? notes.join(", ") : null };
}

export function extractTrailingTags(text: string): { cleaned: string; tags: string[] } {
	const tagPattern = /(?:\s+#[\w/-]+)+$/;
	const match = text.match(tagPattern);
	if (!match) return { cleaned: text, tags: [] };
	const tags = match[0].trim().split(/\s+/).map((t) => t.slice(1));
	return { cleaned: text.slice(0, text.length - match[0].length).trim(), tags };
}

// Paired single-asterisk emphasis, e.g. the *600g* of a RecipeMD amount, which
// otherwise reached the quantity parser with its markers still attached.
// Lookarounds keep multiplication like "2*3 cups" intact.
const SINGLE_ASTERISK_EMPHASIS = /(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?!\w)/g;

export function stripMarkdownEmphasis(text: string): string {
	return text
		// bold/underline first, so neither leaves a stray marker to mispair
		.replace(/\*{2,3}|_{2,}/g, "")
		// single underscores are left alone; they appear inside identifiers
		.replace(SINGLE_ASTERISK_EMPHASIS, "$1")
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

/**
 * RecipeMD: when a name is only an inline link, the link text is the ingredient
 * name and the destination points at a sub-recipe. Unwrapped here rather than in
 * normaliseName so the rendered name keeps its link.
 */
function unwrapLinks(name: string): string {
	return name
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
		.replace(/\[\[([^\]]+)\]\]/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.trim();
}

export function ingredientKey(name: string, unit: string): string {
	return `${normaliseName(unwrapLinks(name))}|${unit.toLowerCase()}`;
}

export function hasIgnoreTag(tags: string[]): boolean {
	return tags.some(
		(t) => t.toLowerCase().replace(/[-_]/g, "") === "ignoreingredient"
	);
}
