/**
 * Pure line-level reading and editing of the grocery note for Pantry sync.
 * Edits are plain text surgery on single lines, never a re-render of the whole
 * note, so a user's formatting and any concurrent keystroke survive. Item
 * identity is the plugin's own ingredient key (injected as keyOf), because the
 * grocery list already merges duplicates on that key.
 */

export interface LocalItem {
	/** Ingredient key (name plus unit). Unique per note: later duplicates are skipped. */
	key: string;
	/** Line text without the checkbox. This is what gets pushed as the Pantry name. */
	text: string;
	checked: boolean;
	/** Text of the nearest `## ` heading above the line, or null before any heading. */
	category: string | null;
	lineIndex: number;
}

export type KeyOf = (text: string) => string | null;

// Same shape the existing grocery parser accepts (grocery-note/parse.ts), so we
// never claim a line the rest of the plugin would treat as opaque.
const CHECKBOX_RE = /^- \[([x ])\] (.+)$/i;
const HEADING_RE = /^## (.*)$/;

export function scanGroceryNote(text: string, keyOf: KeyOf): LocalItem[] {
	const items: LocalItem[] = [];
	const seen = new Set<string>();
	let category: string | null = null;

	text.split("\n").forEach((line, lineIndex) => {
		const heading = line.match(HEADING_RE);
		if (heading) {
			category = heading[1].trim();
			return;
		}
		const m = line.match(CHECKBOX_RE);
		if (!m) return;
		const itemText = m[2].trim();
		const key = keyOf(itemText);
		// A duplicate key should not happen in a plugin-built list. If a user
		// hand-typed one, only the first line syncs so one Pantry item maps to one line.
		if (!key || seen.has(key)) return;
		seen.add(key);
		items.push({ key, text: itemText, checked: m[1].toLowerCase() === "x", category, lineIndex });
	});
	return items;
}

/** Flips the checkbox on the line holding `key`. Returns null when the line is gone or ambiguous. */
export function setCheckedByKey(text: string, key: string, checked: boolean, keyOf: KeyOf): string | null {
	const item = scanGroceryNote(text, keyOf).find((i) => i.key === key);
	if (!item) return null;
	const lines = text.split("\n");
	lines[item.lineIndex] = lines[item.lineIndex].replace(/^- \[[x ]\]/i, checked ? "- [x]" : "- [ ]");
	return lines.join("\n");
}

/**
 * Rewrites the line holding `key` with new text and checkbox state. Used when
 * Pantry renamed or re-quantified an item. Returns null when the line is gone.
 */
export function replaceLineByKey(text: string, key: string, newText: string, checked: boolean, keyOf: KeyOf): string | null {
	const item = scanGroceryNote(text, keyOf).find((i) => i.key === key);
	if (!item) return null;
	const lines = text.split("\n");
	lines[item.lineIndex] = `${checked ? "- [x]" : "- [ ]"} ${newText}`;
	return lines.join("\n");
}

/** Removes the line holding `key`. A heading left empty is kept on purpose, the generator may rely on it. */
export function removeByKey(text: string, key: string, keyOf: KeyOf): string | null {
	const item = scanGroceryNote(text, keyOf).find((i) => i.key === key);
	if (!item) return null;
	const lines = text.split("\n");
	lines.splice(item.lineIndex, 1);
	return lines.join("\n");
}

/**
 * Inserts a new item under the `## ` heading matching `category` (case
 * insensitive, trimmed). A missing heading is appended at the end. When the
 * note has no headings at all, the line is appended to the end of the list
 * instead, because the list is not grouped.
 */
export function insertItem(text: string, itemText: string, checked: boolean, category: string): string {
	const line = `${checked ? "- [x]" : "- [ ]"} ${itemText}`;
	const lines = text.split("\n");
	const wanted = category.trim().toLowerCase();

	const headingIdx = lines.findIndex((l) => {
		const m = l.match(HEADING_RE);
		return m !== null && m[1].trim().toLowerCase() === wanted;
	});

	if (headingIdx >= 0) {
		// Insert after the last non-blank line of the section, so the blank
		// separator before the next heading stays where it was.
		let end = headingIdx;
		for (let i = headingIdx + 1; i < lines.length; i++) {
			if (HEADING_RE.test(lines[i]) || /^# /.test(lines[i])) break;
			if (lines[i].trim() !== "") end = i;
		}
		lines.splice(end + 1, 0, line);
		return lines.join("\n");
	}

	const hasHeadings = lines.some((l) => HEADING_RE.test(l));
	const body = text.replace(/\s+$/, "");
	if (!hasHeadings) return `${body}\n${line}\n`;
	return `${body}\n\n## ${category.trim()}\n${line}\n`;
}
