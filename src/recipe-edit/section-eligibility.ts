/**
 * Decides whether an Ingredients or Steps section is simple enough for the
 * structured editor to rewrite without losing anything. The editor models a
 * section as groups of single-line list items, so any other content (prose,
 * nested bullets, multi-line steps, quotes, tables, code...) would be dropped
 * or flattened on save. Such sections are left alone and edited as Markdown.
 */
import { HEADING_RE, SectionSpan } from "./section-locate";

// Column-0 list item with real text. "- " alone or an indented bullet does not qualify.
const LIST_ITEM_RE = /^(?:[-*+]|\d+\.)\s+\S/;
// "* * *" and "- - -" would otherwise pass LIST_ITEM_RE as an item containing "* *".
const THEMATIC_BREAK_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

export function isListItem(line: string): boolean {
	return LIST_ITEM_RE.test(line) && !THEMATIC_BREAK_RE.test(line);
}

export function isSectionEligible(lines: string[], span: SectionSpan): boolean {
	for (let i = span.headingIdx + 1; i < span.end; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;
		const heading = line.match(HEADING_RE);
		if (heading) {
			// The span already ends at the first heading at or above the section
			// level, so anything here is deeper; checked anyway to stay correct
			// if the span rules ever change.
			if (heading[1].length > span.level) continue;
			return false;
		}
		if (!isListItem(line)) return false;
	}
	return true;
}
