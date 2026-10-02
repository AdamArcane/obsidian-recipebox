/**
 * Pure string transform that applies section edits to a note's raw content.
 * Runs inside vault.process at save time, so it re-locates every section in
 * the CURRENT content and refuses to write if a dirty section no longer
 * matches the snapshot taken at load (the note changed while the modal was
 * open, e.g. via LiveSync). Sections the user did not change are never
 * touched, which is what keeps untouched content byte-identical.
 */
import { ImportedGroup } from "../importer/recipe-extract-types";
import { stripFrontmatter } from "../parser/recipe-frontmatter-strip";
import { locateSection, sectionText, splitFrontmatter, SectionSpan } from "./section-locate";
import { renderGroups, renderSection, SectionStyle } from "./section-render";

export type SectionKind = "ingredients" | "steps" | "notes";

export interface SectionEdit {
	kind: SectionKind;
	/** Configured heading name; the section is found by this at save time. */
	heading: string;
	/** Load-time section text, or null if the section did not exist. */
	snapshot: string | null;
	/** Ingredients and steps. */
	groups?: ImportedGroup[];
	style: SectionStyle;
	/** Notes: raw Markdown below the heading. */
	notesText?: string;
}

export type ApplyResult = { kind: "ok"; content: string } | { kind: "conflict" };

interface Located { edit: SectionEdit; span: SectionSpan }

function trailingBlankCount(lines: string[], span: SectionSpan): number {
	let n = 0;
	for (let i = span.end - 1; i > span.headingIdx && lines[i].trim() === ""; i--) n++;
	return n;
}

function renderEdit(edit: SectionEdit, headingLine: string, level: number, trailingBlanks: number): string[] {
	if (edit.kind === "notes") {
		const text = (edit.notesText ?? "").replace(/^\n+|\n+$/g, "");
		return [headingLine, "", ...(text === "" ? [] : text.split("\n")), ...Array<string>(trailingBlanks).fill("")];
	}
	return renderSection(headingLine, level, edit.groups ?? [], edit.style, trailingBlanks);
}

function newSectionLines(edit: SectionEdit): string[] {
	const headingLine = `## ${edit.heading}`;
	if (edit.kind === "notes") return renderEdit(edit, headingLine, 2, 0);
	return [headingLine, "", ...renderGroups(edit.groups ?? [], 2, edit.style)];
}

/** Inserts a block at idx, keeping one blank line between it and its neighbours. */
function insertBlock(lines: string[], idx: number, block: string[]): void {
	if (idx >= lines.length) {
		// End of file: drop the trailing "" that represents the final newline,
		// add a separator, the block, and a fresh final newline.
		while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
		if (lines.length > 0) lines.push("");
		lines.push(...block, "");
		return;
	}
	const needsLeadBlank = idx > 0 && lines[idx - 1].trim() !== "";
	lines.splice(idx, 0, ...(needsLeadBlank ? [""] : []), ...block, "");
}

function insertionIndex(lines: string[], kind: SectionKind, headings: Record<SectionKind, string>): number {
	const instructions = locateSection(lines, headings.steps);
	const ingredients = locateSection(lines, headings.ingredients);
	if (kind === "ingredients") return instructions ? instructions.headingIdx : lines.length;
	if (kind === "steps") return ingredients ? ingredients.end : lines.length;
	// Notes go after Steps (or after Ingredients when there are no steps).
	if (instructions) return instructions.end;
	return ingredients ? ingredients.end : lines.length;
}

/**
 * `headings` carries all three configured names (not just the edited ones):
 * inserting a missing section anchors on its neighbours, which may be
 * sections the user did not touch.
 */
export function applySectionEdits(raw: string, edits: SectionEdit[], headings: Record<SectionKind, string>): ApplyResult {
	if (edits.length === 0) return { kind: "ok", content: raw };

	// Work on \n only and convert back at the end; headings with a trailing \r
	// would not match the heading regex. Mixed line endings in a note that is
	// being edited get normalized to its dominant (CRLF) style.
	const crlf = raw.includes("\r\n");
	const normalized = crlf ? raw.replace(/\r\n/g, "\n") : raw;
	const { head, body } = splitFrontmatter(normalized, stripFrontmatter);
	const lines = body.split("\n");

	const present: Located[] = [];
	const missing: SectionEdit[] = [];
	for (const edit of edits) {
		const span = locateSection(lines, edit.heading);
		if (edit.snapshot === null) {
			// Loaded as missing; if it exists now someone else created it.
			if (span) return { kind: "conflict" };
			missing.push(edit);
		} else {
			if (!span || sectionText(lines, span) !== edit.snapshot) return { kind: "conflict" };
			present.push({ edit, span });
		}
	}

	// Bottom-up so each replacement leaves the earlier spans' indices valid.
	present.sort((a, b) => b.span.headingIdx - a.span.headingIdx);
	for (let i = 1; i < present.length; i++) {
		// Nested sections (e.g. Notes written as a ### under Steps) would be
		// replaced twice; refuse rather than guess.
		if (present[i].span.end > present[i - 1].span.headingIdx) return { kind: "conflict" };
	}
	for (const { edit, span } of present) {
		const headingLine = lines[span.headingIdx];
		let trailing = trailingBlankCount(lines, span);
		// Keep a separator before the next heading even if the original had none.
		if (span.end < lines.length) trailing = Math.max(trailing, 1);
		lines.splice(span.headingIdx, span.end - span.headingIdx, ...renderEdit(edit, headingLine, span.level, trailing));
	}

	// Insert in document order so each later insertion can anchor on the earlier one.
	const order: SectionKind[] = ["ingredients", "steps", "notes"];
	for (const kind of order) {
		const edit = missing.find((e) => e.kind === kind);
		if (!edit) continue;
		insertBlock(lines, insertionIndex(lines, kind, headings), newSectionLines(edit));
	}

	const out = head + lines.join("\n");
	return { kind: "ok", content: crlf ? out.replace(/\n/g, "\r\n") : out };
}
