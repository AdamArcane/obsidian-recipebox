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

export function splitBodyAroundInstructions(body: string, headingName: string): InstructionSplit {
	const lines = body.split("\n");
	const { index: headingIdx, level: headingLevel } = findHeadingIndex(lines, headingName);

	if (headingIdx < 0) {
		return { before: body, groups: [], after: "" };
	}

	const before = lines.slice(0, headingIdx).join("\n");
	const groups: InstructionGroup[] = [];
	let afterStart = lines.length;
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

	for (let i = headingIdx + 1; i < lines.length; i++) {
		const line = lines[i];
		const hMatch = line.match(HEADING_RE);
		if (hMatch) {
			const depth = hMatch[1].length;
			if (depth <= headingLevel) {
				afterStart = i;
				break;
			}
			flushGroup();
			currentGroupHeading = hMatch[2].trim();
			currentGroupLevel = depth;
		} else {
			currentRawLines.push(line);
		}
	}
	flushGroup();

	const after = lines.slice(afterStart).join("\n");
	return { before, groups, after };
}
