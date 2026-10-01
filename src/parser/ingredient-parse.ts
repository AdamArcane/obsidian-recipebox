/**
 * Parses a single raw ingredient line into a structured ParsedIngredient with
 * quantity, unit, name, inline note, and tags.
 */
import { ParsedIngredient } from "../types";
import type { RecipeBoxSettings } from "../settings/settings-types";
import { parseLeadingQuantity } from "./quantity-parse";
import { getUnitLookup, IngredientUnitOptions } from "./ingredient-units";
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

export function consumeUnit(input: string, options: IngredientParserOptions = {}): { unit: string; remaining: string } {
	// NFC so decomposed accents in recipe text match precomposed aliases.
	// Slicing below uses this normalized string so offsets stay consistent.
	const rest = input.normalize("NFC");
	const lower = rest.toLowerCase();
	const { synonyms, candidates } = getUnitLookup(options.customSynonyms);
	for (const candidate of candidates) {
		if (!lower.startsWith(candidate)) continue;
		let end = candidate.length;
		// Abbreviations are often written with a trailing period ("tbsp.",
		// "lb."). Earlier work in this area rejected every bare alias followed
		// by "." so that "c." would not become cup, which also broke "tbsp." and
		// friends. Tolerate the period(s) for every unit except the single letter
		// "c", which is the one built-in that collides with "c." abbreviations in
		// other languages (e.g. French "c. a s."). Longest-first ordering means a
		// custom alias that includes its own period still wins before we get here.
		if (lower[end] === "." && !candidate.endsWith(".")) {
			if (candidate === "c") continue;
			while (lower[end] === ".") end++;
		}
		const next = lower[end];
		if (next && !/[\s,;:]/.test(next)) continue;
		// A separator right after the unit ("3 lbs, trimmed beef") would
		// otherwise stay at the front of the name.
		const remaining = rest.slice(end).replace(/^[\s,;:]+/, "");
		return { unit: synonyms[candidate], remaining };
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
