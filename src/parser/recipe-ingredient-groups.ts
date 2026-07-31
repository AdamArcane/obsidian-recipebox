/**
 * Splits the recipe body around the ingredients heading into structured
 * IngredientGroups, preserving sub-group headings and surrounding content.
 */
import { IngredientGroup } from "../types";
import { findHeadingIndex } from "./recipe-heading-search";
import { findRecipeMdIngredients } from "./recipemd-sections";

export interface IngredientSplit {
	before: string;
	groups: IngredientGroup[];
	after: string;
	/**
	 * True when the ingredients came from a RecipeMD block rather than a heading.
	 * The instructions splitter needs to know, because a RecipeMD note has no
	 * instructions heading either and everything after the block is the method.
	 */
	isRecipeMd: boolean;
}

const LIST_ITEM_RE = /^[-*+]\s|^\d+\.\s/;
const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

/** Splits a run of ingredient lines into groups, each headed by a heading line. */
function collectGroups(lines: string[]): IngredientGroup[] {
	const groups: IngredientGroup[] = [];
	let current: IngredientGroup = { heading: null, lines: [] };

	for (const line of lines) {
		const heading = line.match(HEADING_RE);
		if (heading) {
			if (current.heading !== null || current.lines.length > 0) groups.push(current);
			current = { heading: heading[2].trim(), lines: [] };
		} else if (LIST_ITEM_RE.test(line)) {
			current.lines.push(line);
		}
	}

	if (current.heading !== null || current.lines.length > 0) groups.push(current);
	return groups.filter((g) => g.lines.length > 0 || g.heading !== null);
}

export function splitBodyAroundIngredients(body: string, headingName: string): IngredientSplit {
	const lines = body.split("\n");
	const { index: headingIdx, level: headingLevel } = findHeadingIndex(lines, headingName);

	if (headingIdx < 0) {
		// RecipeMD keeps its ingredients between two thematic breaks rather than
		// under a heading; without this the whole note counted as "before" and the
		// recipe view showed no ingredients at all.
		const recipeMd = findRecipeMdIngredients(lines);
		if (recipeMd) {
			// Headings inside the block title ingredient groups, exactly as they do
			// under an ingredients heading.
			const groups = collectGroups(lines.slice(recipeMd.start, recipeMd.end));
			if (groups.length > 0) {
				return {
					before: lines.slice(0, recipeMd.start).join("\n"),
					groups,
					// end is the closing break itself; handing it on rendered a stray
					// horizontal rule above the instructions.
					after: lines.slice(recipeMd.end + 1).join("\n"),
					isRecipeMd: true,
				};
			}
		}
		return { before: body, groups: [], after: "", isRecipeMd: false };
	}

	const before = lines.slice(0, headingIdx).join("\n");
	const groups: IngredientGroup[] = [];
	let afterStart = lines.length;
	let currentGroup: IngredientGroup = { heading: null, lines: [] };

	for (let i = headingIdx + 1; i < lines.length; i++) {
		const line = lines[i];
		const hMatch = line.match(HEADING_RE);
		if (hMatch) {
			const depth = hMatch[1].length;
			if (depth <= headingLevel) {
				afterStart = i;
				break;
			}
			groups.push(currentGroup);
			currentGroup = { heading: hMatch[2].trim(), lines: [] };
		} else if (LIST_ITEM_RE.test(line)) {
			currentGroup.lines.push(line);
		}
	}

	// Push the last group if it has content
	if (currentGroup.heading !== null || currentGroup.lines.length > 0) {
		groups.push(currentGroup);
	}

	// Discard trailing empty group (no heading, no lines)
	while (groups.length > 0) {
		const last = groups[groups.length - 1];
		if (last.heading === null && last.lines.length === 0) groups.pop();
		else break;
	}

	const after = lines.slice(afterStart).join("\n");
	return { before, groups, after, isRecipeMd: false };
}
