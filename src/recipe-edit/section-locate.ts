/**
 * Finds a section's line span in a raw (frontmatter-free) body, using the
 * same heading rules as the view's parsers so the editor and the view agree
 * on where a section starts and ends. Pure; no Obsidian imports.
 */
import { findHeadingIndex } from "../parser/recipe-heading-search";

export const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

export interface SectionSpan {
	/** Index of the section heading line. */
	headingIdx: number;
	level: number;
	/** Exclusive: first line of the next heading at the same or a higher level, or lines.length. */
	end: number;
}

export function locateSection(lines: string[], headingName: string): SectionSpan | null {
	const { index, level } = findHeadingIndex(lines, headingName);
	if (index < 0) return null;
	let end = lines.length;
	for (let i = index + 1; i < lines.length; i++) {
		const m = lines[i].match(HEADING_RE);
		if (m && m[1].length <= level) { end = i; break; }
	}
	return { headingIdx: index, level, end };
}

/** The section's exact text, heading included. Used as the conflict-detection snapshot. */
export function sectionText(lines: string[], span: SectionSpan): string {
	return lines.slice(span.headingIdx, span.end).join("\n");
}

/**
 * Splits raw note content into the frontmatter block and the body such that
 * head + body === raw. stripFrontmatter returns a suffix of its input, so
 * the head is whatever is left over; this keeps the split byte-exact.
 */
export function splitFrontmatter(raw: string, strip: (s: string) => string): { head: string; body: string } {
	const body = strip(raw);
	return { head: raw.slice(0, raw.length - body.length), body };
}
