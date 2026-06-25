/**
 * Locates a Markdown heading by name within a pre-split array of lines,
 * returning its index and level for use by the ingredient and instruction parsers.
 */
export interface HeadingResult {
	index: number;
	level: number;
}

const NOT_FOUND: HeadingResult = { index: -1, level: 0 };
// Matches # through ###### headings; trims optional trailing hashes
const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

export function findHeadingIndex(lines: string[], headingName: string): HeadingResult {
	const target = headingName.trim().toLowerCase();
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(HEADING_RE);
		if (m && m[2].trim().toLowerCase() === target) {
			return { index: i, level: m[1].length };
		}
	}
	return NOT_FOUND;
}
