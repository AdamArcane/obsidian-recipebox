/**
 * Parses a single raw ingredient line into a structured ParsedIngredient with
 * quantity, unit, name, inline note, and tags.
 */
import { ParsedIngredient } from "../types";
import type { RecipeBoxSettings } from "../settings/settings-types";
import { parseLeadingQuantity } from "./quantity-parse";
import { compileUnitSynonyms, IngredientUnitOptions } from "./ingredient-units";
import {
	stripListMarkers,
	extractInlineNotes,
	extractTrailingTags,
	stripMarkdownEmphasis,
	stripOf,
	normaliseName,
} from "./ingredient-clean";

export interface IngredientParserOptions extends IngredientUnitOptions {
	fillerWord?: string;
}

export function ingredientParserOptions(settings: Pick<RecipeBoxSettings, "ingredientUnitSynonyms" | "ingredientFillerWord">): IngredientParserOptions {
	return { customSynonyms: settings.ingredientUnitSynonyms, fillerWord: settings.ingredientFillerWord };
}

export function consumeUnit(rest: string, options: IngredientParserOptions = {}): { unit: string; remaining: string } {
	const lower = rest.toLowerCase();
	const synonyms = compileUnitSynonyms(options.customSynonyms);
	const candidates = Object.keys(synonyms).sort((a, b) => b.length - a.length);
	for (const candidate of candidates) {
		if (!lower.startsWith(candidate)) continue;
		const next = lower[candidate.length];
		// A period after a bare alias is usually an abbreviation, not a unit
		// boundary. This prevents `c.` from becoming cup by accident.
		if (next === "." && !candidate.endsWith(".")) continue;
		if (next && !/[\s,;:]/.test(next)) continue;
		return { unit: synonyms[candidate], remaining: rest.slice(candidate.length).trim() };
	}

	return { unit: "", remaining: rest };
}

export function parseIngredientLine(line: string, options: IngredientParserOptions = {}): ParsedIngredient | null {
	const raw = line;

	let text = stripListMarkers(line);
	if (!text) return null;

	text = stripMarkdownEmphasis(text);

	const { cleaned: afterTags, tags } = extractTrailingTags(text);
	text = afterTags;

	const { cleaned: afterNotes, note } = extractInlineNotes(text);
	text = afterNotes;

	const { quantity, rest: afterQty } = parseLeadingQuantity(text);
	text = stripOf(afterQty, options.fillerWord);

	const { unit, remaining: afterUnit } = consumeUnit(text, options);
	text = stripOf(afterUnit, options.fillerWord);

	// Strip trailing punctuation
	text = text.replace(/[,;:.]+$/, "").trim();

	const name = normaliseName(text);
	if (!name) return null;

	// A quantity with nothing else attached is not a valid ingredient
	if (quantity !== null && !name) return null;

	return { quantity, unit, name, note, tags, raw };
}
