/**
 * Splits the recipe body around the instructions heading into structured
 * InstructionGroups, collecting ordered or unordered steps per sub-section.
 */
import { InstructionGroup } from "../types";
import { findHeadingIndex } from "./recipe-heading-search";

export interface InstructionSplit {
	before: string;
	groups: InstructionGroup[];
	after: string;
}

const ORDERED_ITEM_RE = /^\d+\.\s/;
const UNORDERED_ITEM_RE = /^[-*+]\s/;
const ANY_LIST_ITEM_RE = /^(?:\d+\.|-|\*|\+)\s/;
const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;
const HR_RE = /^[-*_]{3,}\s*$/;

function parseSteps(rawLines: string[]): string[] {
	if (rawLines.length === 0) return [];

	const isOrdered = rawLines.some(l => ORDERED_ITEM_RE.test(l));
	const markerRe = isOrdered ? ORDERED_ITEM_RE : UNORDERED_ITEM_RE;
	const fallback = !isOrdered && rawLines.some(l => UNORDERED_ITEM_RE.test(l));
	if (!isOrdered && !fallback) return [];

	const steps: string[] = [];
	let current: string[] | null = null;

	for (const line of rawLines) {
		if (markerRe.test(line)) {
			if (current !== null) steps.push(buildStep(current));
			current = [line];
		} else if (current !== null) {
			current.push(line);
		}
	}
	if (current !== null) steps.push(buildStep(current));
	return steps;
}

function buildStep(lines: string[]): string {
	// Strip trailing HR lines
	while (lines.length > 0 && HR_RE.test(lines[lines.length - 1].trim())) {
		lines.pop();
	}
	// Strip the list marker from the first line so the <ol> handles numbering
	if (lines.length > 0) lines[0] = lines[0].replace(ANY_LIST_ITEM_RE, "");
	return lines.join("\n").trim();
}

/**
 * Index of the first heading at or above `sectionLevel`, which is where the
 * method stops and trailing sections (Notes, Cook History, anything the user
 * added) begin. Returns lines.length when the method runs to the end.
 */
function findSectionBoundary(lines: string[], from: number, sectionLevel: number): number {
	for (let i = from; i < lines.length; i++) {
		const hMatch = lines[i].match(HEADING_RE);
		if (hMatch && hMatch[1].length <= sectionLevel) return i;
	}
	return lines.length;
}

/**
 * Builds instruction groups from a method region. Headings deeper than
 * `sectionLevel` open a sub-group; the caller has already cut the region at the
 * first heading that is not deeper, so none appears here.
 */
function collectGroups(lines: string[], sectionLevel: number): InstructionGroup[] {
	const groups: InstructionGroup[] = [];
	let currentGroupHeading: string | null = null;
	let currentGroupLevel = 0;
	let currentRawLines: string[] = [];

	function flushGroup(): void {
		const steps = parseSteps(currentRawLines);
		if (currentGroupHeading !== null || steps.length > 0) {
			groups.push({
				heading: currentGroupHeading,
				headingLevel: currentGroupLevel,
				steps,
			});
		}
		currentRawLines = [];
	}

	for (const line of lines) {
		const hMatch = line.match(HEADING_RE);
		if (hMatch && hMatch[1].length > sectionLevel) {
			flushGroup();
			currentGroupHeading = hMatch[2].trim();
			currentGroupLevel = hMatch[1].length;
		} else {
			currentRawLines.push(line);
		}
	}
	flushGroup();
	return groups;
}

// RecipeMD marks the method with a thematic break rather than a heading, so
// there is no instructions heading whose depth says where the method ends. The
// spec puts the title at level 1, which makes level 2 the section level, and
// level 2 is also what this plugin appends when it writes its own sections
// (## Cook History). Using it as the reference lets the identical rule that
// governs heading-based notes apply here: deeper headings group the method,
// headings at this level or above end it and become trailing sections.
//
// Deliberately a constant rather than derived from the note's own title, since
// cleanNoteBody may already have stripped that h1 before this runs.
const RECIPEMD_SECTION_LEVEL = 2;

/**
 * RecipeMD's own reading of the method is "everything after the second thematic
 * break, to the end of the file", which leaves no room for the trailing sections
 * this plugin supports -- a Notes section, or the Cook History block the plugin
 * appends itself, would otherwise be swallowed into the final step. Ending the
 * method at a section-level heading is a deliberate, documented divergence from
 * the spec so both note formats behave the same way.
 */
function splitRecipeMdMethod(lines: string[]): InstructionSplit {
	const boundary = findSectionBoundary(lines, 0, RECIPEMD_SECTION_LEVEL);
	const methodLines = lines.slice(0, boundary);
	const after = lines.slice(boundary).join("\n");

	const groups = collectGroups(methodLines, RECIPEMD_SECTION_LEVEL);
	// A method with no list markers yields no steps. Hand it back as prose
	// instead of dropping it, which is what this path did before it learned
	// about trailing sections.
	if (groups.length === 0) return { before: methodLines.join("\n"), groups: [], after };

	return { before: "", groups, after };
}

export function splitBodyAroundInstructions(body: string, headingName: string, isRecipeMd = false): InstructionSplit {
	const lines = body.split("\n");
	const { index: headingIdx, level: headingLevel } = findHeadingIndex(lines, headingName);

	if (headingIdx < 0) {
		// Only trusted when the caller says the note is RecipeMD: in a heading-based
		// note this text is whatever follows the ingredients, and a bulleted "Notes"
		// section is not a method.
		if (isRecipeMd) return splitRecipeMdMethod(lines);
		return { before: body, groups: [], after: "" };
	}

	const boundary = findSectionBoundary(lines, headingIdx + 1, headingLevel);
	return {
		before: lines.slice(0, headingIdx).join("\n"),
		groups: collectGroups(lines.slice(headingIdx + 1, boundary), headingLevel),
		after: lines.slice(boundary).join("\n"),
	};
}
