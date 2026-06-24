import { ParsedIngredient } from "../types";
import { parseLeadingQuantity } from "./quantity-parse";
import { UNIT_SYNONYMS } from "./ingredient-units";
import {
	stripListMarkers,
	extractInlineNotes,
	extractTrailingTags,
	stripMarkdownEmphasis,
	stripOf,
	normaliseName,
} from "./ingredient-clean";

export function consumeUnit(rest: string): { unit: string; remaining: string } {
	const lower = rest.toLowerCase();

	// Two-word fluid ounce forms
	for (const twoWord of ["fluid ounces", "fluid ounce", "fl oz"]) {
		if (lower.startsWith(twoWord)) {
			return { unit: "fl oz", remaining: rest.slice(twoWord.length).trim() };
		}
	}

	const token = rest.split(/\s+/)[0];
	const strippedToken = token.replace(/\.+$/, "");
	const canonical = UNIT_SYNONYMS[strippedToken.toLowerCase()];
	if (canonical !== undefined) {
		return { unit: canonical, remaining: rest.slice(token.length).trim() };
	}

	return { unit: "", remaining: rest };
}

export function parseIngredientLine(line: string): ParsedIngredient | null {
	const raw = line;

	let text = stripListMarkers(line);
	if (!text) return null;

	text = stripMarkdownEmphasis(text);

	const { cleaned: afterTags, tags } = extractTrailingTags(text);
	text = afterTags;

	const { cleaned: afterNotes, note } = extractInlineNotes(text);
	text = afterNotes;

	const { quantity, rest: afterQty } = parseLeadingQuantity(text);
	text = stripOf(afterQty);

	const { unit, remaining: afterUnit } = consumeUnit(text);
	text = stripOf(afterUnit);

	// Strip trailing punctuation
	text = text.replace(/[,;:.]+$/, "").trim();

	const name = normaliseName(text);
	if (!name) return null;

	// A quantity with nothing else attached is not a valid ingredient
	if (quantity !== null && !name) return null;

	return { quantity, unit, name, note, tags, raw };
}
