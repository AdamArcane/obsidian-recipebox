/**
 * Turns edited groups back into Markdown lines for one section. Only ever
 * applied to sections the user changed, so the layout normalization here
 * (blank line after each heading, before each sub-group) never touches
 * sections that were left alone.
 */
import { ImportedGroup } from "../importer/recipe-extract-types";

export interface SectionStyle {
	/** Bullet char for unordered output ("-", "*" or "+"). */
	bullet: string;
	/** Steps only: renumber 1., 2., ... per group instead of using bullets. */
	ordered: boolean;
}

export const DEFAULT_STYLE: SectionStyle = { bullet: "-", ordered: false };

const MARKER_RE = /^(?:[-*+]|\d+\.)\s+/;

/** Removes a leading list marker; the entry editors work on bare text. */
export function stripMarker(line: string): string {
	return line.replace(MARKER_RE, "");
}

/** Groups whose only content is "nothing" are dropped so [] and [{null, []}] compare equal. */
export function normalizeGroups(groups: ImportedGroup[]): ImportedGroup[] {
	return groups
		.filter((g) => g.name !== null || g.items.length > 0)
		.map((g) => ({ name: g.name, items: [...g.items], headingLevel: g.headingLevel }));
}

export function groupsEqual(a: ImportedGroup[], b: ImportedGroup[]): boolean {
	const na = normalizeGroups(a);
	const nb = normalizeGroups(b);
	if (na.length !== nb.length) return false;
	return na.every((g, i) => g.name === nb[i].name
		&& g.items.length === nb[i].items.length
		&& g.items.every((item, j) => item === nb[i].items[j]));
}

function renderItems(items: string[], style: SectionStyle): string[] {
	return items.map((item, i) => (style.ordered ? `${i + 1}. ${item}` : `${style.bullet} ${item}`));
}

/**
 * Lines for a section body (everything after the section heading). An
 * unnamed group is only meaningful as the first one; a later unnamed group
 * has no heading to hang on, so its items simply continue the previous list.
 */
export function renderGroups(groups: ImportedGroup[], sectionLevel: number, style: SectionStyle): string[] {
	const out: string[] = [];
	for (const group of normalizeGroups(groups)) {
		if (group.name !== null) {
			if (out.length > 0) out.push("");
			// Existing sub-group headings keep their original level where the
			// loader recorded it; groups created in the editor use section level + 1.
			const level = Math.min(6, group.headingLevel ?? sectionLevel + 1);
			out.push(`${"#".repeat(level)} ${group.name}`, "");
		}
		out.push(...renderItems(group.items, style));
	}
	return out;
}

/** Full replacement for a section: heading line, blank, body, then the original trailing blank run. */
export function renderSection(
	headingLine: string,
	sectionLevel: number,
	groups: ImportedGroup[],
	style: SectionStyle,
	trailingBlanks: number,
): string[] {
	const body = renderGroups(groups, sectionLevel, style);
	return [headingLine, "", ...body, ...Array<string>(trailingBlanks).fill("")];
}
