/**
 * Rebuilds an ingredient markdown line with its quantity scaled by the
 * recipe's multiplier. Raw markdown text has no addressable "quantity"
 * substring to patch in place, so this parses the line and reformats it from
 * the parsed fields -- the same parse/scale/reformat tradeoff
 * ingredients-section.ts already makes for the on-screen DOM view when the
 * multiplier isn't 1 (original text nuance like custom spacing is lost, but
 * only when actually scaling; at multiplier 1 the raw line passes through
 * unchanged).
 */
import { IngredientParserOptions, parseIngredientLine } from "../parser/ingredient-parse";
import { scaleAmount } from "../parser/ingredient-amount";

// Captures the bullet/number marker plus an optional task-list checkbox
// ("- [ ] ", "- [x] ", "1. [?] ") -- mirrors ingredient-clean.ts's
// stripListMarkers(), which strips the same two pieces, so a checked or
// unchecked checkbox survives the rebuild instead of collapsing to a plain bullet.
const LIST_MARKER_RE = /^(\s*(?:[-*+]|\d+\.)\s+(?:\[[ x?]\]\s*)?)/i;

export function rescaleIngredientLine(raw: string, multiplier: number, parserOptions?: IngredientParserOptions): string {
	if (multiplier === 1) return raw;

	const parsed = parseIngredientLine(raw, parserOptions);
	if (!parsed || !parsed.name) return raw;

	const markerMatch = raw.match(LIST_MARKER_RE);
	const marker = markerMatch ? markerMatch[1] : "- ";

	// A range is rebuilt as "2-3" and a second measure as "/ 8 oz" so neither
	// is dropped or pushed into the name when the line is rescaled.
	const amount = scaleAmount(parsed, multiplier, "-");
	const altStr = amount.alt ? `/ ${amount.alt.text} ${amount.alt.unit}` : "";

	let line = [amount.text, parsed.unit, altStr, parsed.name].filter(Boolean).join(" ");
	if (parsed.note) line += ` (${parsed.note})`;
	for (const tag of parsed.tags) line += ` #${tag}`;

	return `${marker}${line}`;
}
