/**
 * Parses a single raw ingredient line into a structured ParsedIngredient with
 * quantity, unit, name, inline note, and tags.
 */
import { ParsedIngredient } from "../types";
import { parseLeadingQuantity } from "./quantity-parse";
import { ParseVocabulary, PhraseTable } from "./vocabulary";
import { normalisePhrase } from "./phrase-normalise";
import { extractQualifiers } from "./ingredient-qualifiers";
import {
	stripListMarkers,
	extractInlineNotes,
	extractTrailingTags,
	stripMarkdownEmphasis,
	stripOf,
	normaliseName,
} from "./ingredient-clean";

// Longest-first over whole words, so "colher de sopa" is preferred to "colher"
// and multi-word forms like "fluid ounces" need no special case.
export function consumeUnit(rest: string, units: PhraseTable): { unit: string; remaining: string } {
	const words: { text: string; end: number }[] = [];
	const wordPattern = /\S+/g;
	let match: RegExpExecArray | null;
	while (words.length < units.maxWords && (match = wordPattern.exec(rest)) !== null) {
		words.push({ text: match[0], end: match.index + match[0].length });
	}

	for (let count = words.length; count >= 1; count--) {
		const form = normalisePhrase(words.slice(0, count).map((w) => w.text).join(" "));
		const canonical = units.forms.get(form);
		if (canonical !== undefined) {
			return { unit: canonical, remaining: rest.slice(words[count - 1].end).trim() };
		}
	}

	return { unit: "", remaining: rest };
}

export function parseIngredientLine(line: string, vocabulary: ParseVocabulary): ParsedIngredient | null {
	const raw = line;

	let text = stripListMarkers(line);
	if (!text) return null;

	text = stripMarkdownEmphasis(text);

	const { cleaned: afterTags, tags } = extractTrailingTags(text);
	text = afterTags;

	const { cleaned: afterNotes, note } = extractInlineNotes(text);
	text = afterNotes;

	const { quantity, rest: afterQty } = parseLeadingQuantity(text, vocabulary.numerals);
	text = stripOf(afterQty, vocabulary.prepositions);

	const { unit, remaining: afterUnit } = consumeUnit(text, vocabulary.units);
	text = stripOf(afterUnit, vocabulary.prepositions);

	// Strip trailing punctuation
	text = text.replace(/[,;:.]+$/, "").trim();

	// Qualifiers move to the note so the grocery list merges on what is bought,
	// while the recipe view still shows how to prepare it.
	const split = extractQualifiers(normaliseName(text), vocabulary.qualifiers);
	const name = split.name;
	if (!name) return null;

	// A quantity with nothing else attached is not a valid ingredient
	if (quantity !== null && !name) return null;

	const notes = [note, ...split.qualifiers].filter((n): n is string => !!n);

	return { quantity, unit, name, note: notes.length > 0 ? notes.join(", ") : null, tags, raw };
}
