/**
 * Parses a plain-text or lightly-marked-up recipe (e.g. pasted from a social
 * caption) into an ExtractedRecipe by running a section state machine over its lines.
 */
import { ExtractedRecipe, ImportedGroup } from "./recipe-extract-types";
import { decodeHtmlEntities } from "./html-entity-decode";
import { INGREDIENTS_SECTION_RE, INSTRUCTIONS_SECTION_RE, isSectionKeyword } from "./text-recipe-detect";

const HTML_TAG_RE = /<[^>]+>/g;
const EXCESS_BLANK_RE = /\n{3,}/g;
const MD_HEADING_RE = /^#{1,6}\s+(.+)/;
const LIST_ITEM_RE = /^(?:[-*+•]|\d+\.|[¼-¾⅐-⅞])\s/;
const ORDERED_MARKER_RE = /^\d+\.\s+/;
const UNORDERED_MARKER_RE = /^[-*+•]\s+/;

// --- Loose metadata extraction ---

function timeToMinutes(value: string, unit: string): number | null {
	const n = Number(value);
	if (!isFinite(n) || n <= 0) return null;
	return /h/i.test(unit) ? Math.round(n * 60) : Math.round(n);
}

function extractLooseTime(text: string, label: string): number | null {
	const re = new RegExp(
		`${label}[^\\d]{0,20}(\\d+(?:\\.\\d+)?)\\s*(min(?:utes?)?|hr?s?|hours?)`,
		"i",
	);
	const m = re.exec(text);
	return m ? timeToMinutes(m[1], m[2]) : null;
}

function extractLooseNumber(text: string, label: string): number | null {
	// The label wraps in a non-capturing group because callers like the
	// calories/carbs labels below contain a top-level "|" alternation
	// (e.g. "calories?|cal(?:ories?)?\\b") -- without grouping, the
	// [^\d]{0,15}(\d+) suffix only binds to the last alternative, so a
	// match against an earlier alternative leaves the digit-capturing
	// group unmatched and Number(undefined) silently returns NaN.
	const re = new RegExp(`(?:${label})[^\\d]{0,15}(\\d+)`, "i");
	const m = re.exec(text);
	return m ? Number(m[1]) : null;
}

// --- Text cleaning ---

function cleanText(raw: string): string {
	return raw
		.replace(HTML_TAG_RE, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(EXCESS_BLANK_RE, "\n\n");
}

// --- Ingredient sub-group detection ---

function isIngredientSubHeading(line: string): boolean {
	if (LIST_ITEM_RE.test(line)) return false;
	return line.endsWith(":") || line === line.toUpperCase();
}

// --- Instruction sub-group detection ---

function isInstructionSubHeading(line: string): boolean {
	return MD_HEADING_RE.test(line) || (!MD_HEADING_RE.test(line) && line.endsWith(":") && line.length > 1);
}

function stripStepMarker(line: string): string {
	return line.replace(ORDERED_MARKER_RE, "").replace(UNORDERED_MARKER_RE, "");
}

// --- Group assembly ---

function buildIngredientGroups(lines: string[]): ImportedGroup[] {
	const groups: ImportedGroup[] = [{ name: null, items: [] }];
	for (const line of lines) {
		if (!line.trim()) continue;
		if (isIngredientSubHeading(line.trim())) {
			groups.push({ name: line.replace(/:$/, "").trim(), items: [] });
		} else {
			groups[groups.length - 1].items.push(line.trim());
		}
	}
	return groups.filter(g => g.name !== null || g.items.length > 0);
}

function buildInstructionGroups(lines: string[]): ImportedGroup[] {
	const groups: ImportedGroup[] = [{ name: null, items: [] }];
	for (const line of lines) {
		if (!line.trim()) continue;
		const trimmed = line.trim();
		const headingMatch = MD_HEADING_RE.exec(trimmed);
		if (headingMatch) {
			groups.push({ name: headingMatch[1].trim(), items: [] });
		} else if (isInstructionSubHeading(trimmed)) {
			groups.push({ name: trimmed.replace(/:$/, "").trim(), items: [] });
		} else {
			const step = stripStepMarker(trimmed);
			if (step) groups[groups.length - 1].items.push(step);
		}
	}
	return groups.filter(g => g.name !== null || g.items.length > 0);
}

// --- Main export ---

export function extractRecipeFromText(rawText: string, titleOverride?: string): ExtractedRecipe {
	const cleaned = decodeHtmlEntities(cleanText(rawText));
	const allLines = cleaned.split("\n");

	// Title detection
	let titleLineIndex = -1;
	let title = titleOverride ?? "";
	if (!title) {
		for (let i = 0; i < allLines.length; i++) {
			const line = allLines[i].trim();
			if (!line) continue;
			const headingMatch = MD_HEADING_RE.exec(line);
			if (headingMatch) {
				title = headingMatch[1].trim();
				titleLineIndex = i;
				break;
			}
			if (!isSectionKeyword(line)) {
				title = line;
				titleLineIndex = i;
			}
			break;
		}
	}

	// Loose metadata from full text
	const servingsMatch =
		/(?:serves?|yield|servings?|makes?)[^\d]{0,15}(\d+)/i.exec(cleaned);
	const servings = servingsMatch ? servingsMatch[1] : null;
	const prepTime = extractLooseTime(cleaned, "prep(?:\\s+time)?");
	const cookTime = extractLooseTime(cleaned, "cook(?:ing)?(?:\\s+time)?");
	const totalTime = extractLooseTime(cleaned, "total(?:\\s+time)?");
	const calories = extractLooseNumber(cleaned, "calories?|cal(?:ories?)?\\b");
	const protein = extractLooseNumber(cleaned, "protein");
	const fat = extractLooseNumber(cleaned, "fat");
	const carbs = extractLooseNumber(cleaned, "carbs?|carbohydrates?");

	// Section state machine
	type Section = "before" | "ingredients" | "instructions";
	let section: Section = "before";
	const descLines: string[] = [];
	const ingredientLines: string[] = [];
	const instructionLines: string[] = [];
	let foundAnySection = false;

	for (let i = 0; i < allLines.length; i++) {
		if (i === titleLineIndex) continue;
		const line = allLines[i];
		const trimmed = line.trim();

		if (INGREDIENTS_SECTION_RE.test(trimmed)) {
			section = "ingredients";
			foundAnySection = true;
			continue;
		}
		if (INSTRUCTIONS_SECTION_RE.test(trimmed)) {
			section = "instructions";
			foundAnySection = true;
			continue;
		}

		if (section === "before") descLines.push(line);
		else if (section === "ingredients") ingredientLines.push(line);
		else instructionLines.push(line);
	}

	if (!foundAnySection) {
		// Graceful degradation: all body becomes description
		descLines.push(...ingredientLines, ...instructionLines);
		ingredientLines.length = 0;
		instructionLines.length = 0;
	}

	return {
		title,
		description: descLines.join("\n").trim(),
		heroImage: null,
		servings,
		prepTime,
		cookTime,
		totalTime,
		ingredientGroups: buildIngredientGroups(ingredientLines),
		instructionGroups: buildInstructionGroups(instructionLines),
		// Text-mode import (pasted captions/text) has no notes-block detection --
		// always empty, same convention as "no notes found" from the URL path.
		notesGroups: [],
		sourceUrl: "",
		calories: calories !== null ? Math.round(calories) : null,
		protein: protein !== null ? Math.round(protein) : null,
		fat: fat !== null ? Math.round(fat) : null,
		carbs: carbs !== null ? Math.round(carbs) : null,
	};
}
