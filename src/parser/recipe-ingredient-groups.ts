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
}

const LIST_ITEM_RE = /^[-*+]\s|^\d+\.\s/;
const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/;

export function splitBodyAroundIngredients(body: string, headingName: string): IngredientSplit {
	const lines = body.split("\n");
	const { index: headingIdx, level: headingLevel } = findHeadingIndex(lines, headingName);

	if (headingIdx < 0) {
		// RecipeMD keeps its ingredients between two thematic breaks rather than
		// under a heading; without this the whole note counted as "before" and the
		// recipe view showed no ingredients at all.
		const recipeMd = findRecipeMdIngredients(lines);
		if (recipeMd) {
			const recipeMdLines = lines.slice(recipeMd.start, recipeMd.end).filter((l) => LIST_ITEM_RE.test(l));
			if (recipeMdLines.length > 0) {
				return {
					before: lines.slice(0, recipeMd.start).join("\n"),
					groups: [{ heading: null, lines: recipeMdLines }],
					after: lines.slice(recipeMd.end).join("\n"),
				};
			}
		}
		return { before: body, groups: [], after: "" };
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
	return { before, groups, after };
}
