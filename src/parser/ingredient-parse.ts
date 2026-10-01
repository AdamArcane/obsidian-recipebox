/**
 * Parses a single raw ingredient line into a structured ParsedIngredient with
 * quantity, unit, name, inline note, and tags.
 */
import { AlternateMeasure, ParsedIngredient } from "../types";
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
		// "/" and "|" can sit directly against a unit in a dual measure
		// ("1 cup/240 ml", "8 cups|1892 ml water").
		if (next && !/[\s,;:/|]/.test(next)) continue;
		// A separator right after the unit ("3 lbs, trimmed beef") would
		// otherwise stay at the front of the name.
		const remaining = rest.slice(end).replace(/^[\s,;:]+/, "");
		return { unit: synonyms[candidate], remaining };
	}

	return { unit: "", remaining: rest };
}

// Matches the separator between two measures: "125 g / 4 oz", "8 cups|1892 ml".
const ALT_SEPARATOR = /^\s*[/|]\s*/;

/**
 * Reads an optional second measure ("/ 4 oz") that follows the first unit. It
 * must be a number plus a recognised unit, so a stray slash in the name
 * ("1 can / tin of beans" or "2 g / some note") is left alone. Goes through
 * consumeUnit so custom unit synonyms apply to the second measure too.
 */
function consumeAlternateMeasure(
	input: string,
	options: IngredientParserOptions
): { alt?: AlternateMeasure; remaining: string } {
	const sep = input.match(ALT_SEPARATOR);
	if (!sep) return { remaining: input };
	const { quantity, rest } = parseLeadingQuantity(input.slice(sep[0].length));
	if (quantity === null) return { remaining: input };
	const { unit, remaining } = consumeUnit(rest, options);
	if (!unit) return { remaining: input };
	return { alt: { quantity, unit }, remaining };
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

	const { quantity, min, rest: afterQty } = parseLeadingQuantity(text);
	text = stripOf(afterQty, options.fillerWord);

	const { unit, remaining: afterUnit } = consumeUnit(text, options);
	// Only look for a second measure when the first had a unit, so a bare
	// "1 / 2 ..." is not mistaken for "1 <unit> / 2 <unit>".
	const { alt, remaining: afterAlt } = unit ? consumeAlternateMeasure(afterUnit, options) : { alt: undefined, remaining: afterUnit };
	text = stripOf(afterAlt, options.fillerWord);

	// Strip trailing punctuation
	text = text.replace(/[,;:.]+$/, "").trim();

	const name = normaliseName(text);
	if (!name) return null;

	// A quantity with nothing else attached is not a valid ingredient
	if (quantity !== null && !name) return null;

	const result: ParsedIngredient = { quantity, unit, name, note, tags, raw };
	// Optional fields are only set when present so existing callers and
	// toEqual comparisons on plain ingredients are unaffected.
	if (min !== undefined) result.quantityMin = min;
	if (alt) result.alt = alt;
	return result;
}
