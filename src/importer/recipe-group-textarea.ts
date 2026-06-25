/**
 * Converts between ImportedGroup arrays and editable textarea strings, used by
 * the import review stage to let users edit ingredients and instructions freely.
 */
import { ImportedGroup } from "./recipe-extract-types";

const LIST_MARKER_RE = /^(?:\d+\.|-|\*|\+|•)\s+/;

export function groupsToTextarea(groups: ImportedGroup[]): string {
	const lines: string[] = [];
	for (const group of groups) {
		if (group.name !== null) lines.push(`## ${group.name}`);
		for (const item of group.items) lines.push(item);
	}
	return lines.join("\n");
}

export function textareaToGroups(text: string): ImportedGroup[] {
	const groups: ImportedGroup[] = [{ name: null, items: [] }];

	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (!line) continue;
		if (/^#{1,6}\s+/.test(line)) {
			groups.push({ name: line.replace(/^#{1,6}\s+/, ""), items: [] });
		} else {
			groups[groups.length - 1].items.push(line.replace(LIST_MARKER_RE, ""));
		}
	}

	// Drop leading unnamed empty group
	if (groups.length > 1 && groups[0].name === null && groups[0].items.length === 0) {
		groups.shift();
	}
	return groups;
}
