/**
 * Rebuilds an ingredient markdown line with its quantity scaled by the
 * recipe's multiplier. Raw markdown text has no addressable "quantity"
 * substring to patch in place, so this parses the line and reformats it from
 * the parsed fields -- the same parse/scale/reformat tradeoff
 * ingredients-section.ts already makes for the on-screen DOM view when the
 * multiplier isn't 1 (original text nuance like custom spacing is lost, but
 * only when actually scaling; at multiplier 1 the raw line passes through
 * unchanged).
 *
 * A line with no quantity also passes through untouched, since there is nothing
 * for the multiplier to change and reformatting it would be pure loss.
 */
import { ParsedIngredient } from "../types";
import { parseIngredientLine } from "../parser/ingredient-parse";
import { ParseVocabulary } from "../parser/vocabulary";
import { normalisePhrase } from "../parser/phrase-normalise";
import { formatQuantity } from "../parser/quantity-format";

// Captures the bullet/number marker plus an optional task-list checkbox
// ("- [ ] ", "- [x] ", "1. [?] ") -- mirrors ingredient-clean.ts's
// stripListMarkers(), which strips the same two pieces, so a checked or
// unchecked checkbox survives the rebuild instead of collapsing to a plain bullet.
const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+(?:\[[ x?]\]\s*)?)/i;

/**
 * Recovers the preposition that joined a unit to its ingredient, which the parser
 * strips. Dropping it is harmless in English, where "4 cup flour" reads much like
 * "4 cups of flour", but "4 dente alho" is not a sentence in Portuguese, where the
 * "de" is mandatory. Only locale prepositions are restored, so English output is
 * unchanged.
 *
 * parsed.unit holds the canonical form rather than the spelling the recipe used
 * ("dentes" arrives as "dente"), so the joiner cannot be located by searching for
 * the unit. It is found by looking for a preposition sitting immediately in front
 * of the ingredient name instead.
 */
function recoverJoiner(raw: string, parsed: ParsedIngredient, prepositions: readonly string[]): string {
	// With no unit there is no unit-to-name joint for a preposition to sit in, and
	// a leading "de" would belong to the name itself ("pão de ló").
	if (!parsed.unit || prepositions.length === 0) return "";

	const firstWord = normalisePhrase(parsed.name.split(/\s+/)[0] ?? "");
	if (!firstWord) return "";

	const haystack = normalisePhrase(raw);
	return prepositions.find((p) => haystack.includes(` ${normalisePhrase(p)} ${firstWord}`)) ?? "";
}

export function rescaleIngredientLine(raw: string, multiplier: number, vocabulary: ParseVocabulary): string {
	if (multiplier === 1) return raw;

	const parsed = parseIngredientLine(raw, vocabulary);
	if (!parsed || !parsed.name) return raw;

	// Nothing to scale means nothing to rewrite. Rebuilding regardless used to
	// reformat lines the multiplier never touched, which got much more visible once
	// qualifiers moved into the note: "- sal q.b." came back as "- sal (q.b.)".
	if (parsed.quantity === null) return raw;

	const markerMatch = raw.match(LIST_MARKER_RE);
	const marker = markerMatch ? markerMatch[1] : "- ";

	const qtyStr = formatQuantity(parsed.quantity * multiplier);
	const joiner = recoverJoiner(raw, parsed, vocabulary.prepositions);

	let line = [qtyStr, parsed.unit, joiner, parsed.name].filter(Boolean).join(" ");
	if (parsed.note) line += ` (${parsed.note})`;
	for (const tag of parsed.tags) line += ` #${tag}`;

	return `${marker}${line}`;
}
