/**
 * Splits an ingredient line into the add-recipe editor's qty / unit / name /
 * note fields and joins them back. Kept free of Obsidian imports so it can be
 * unit tested.
 */
import { parseLeadingQuantity } from "../../parser/quantity-parse";
import { consumeAlternateMeasure, consumeUnit, IngredientParserOptions } from "../../parser/ingredient-parse";
import { stripListMarkers, extractInlineNotes, stripOf } from "../../parser/ingredient-clean";

// Mirrors parseIngredientLine's pipeline but skips its final normaliseName
// step -- that lowercases the name for grocery-list matching, which is
// correct there but wrong here: re-clicking a list row to edit it would
// otherwise silently lowercase whatever casing the user originally typed.
// That is why this cannot simply call parseIngredientLine. It does take the
// same parser options so custom unit mappings and the filler word behave
// identically to the recipe view and grocery list.
export function decomposeIngredient(line: string, options: IngredientParserOptions): Record<string, string> {
	let text = stripListMarkers(line);
	const { cleaned: afterNotes, note } = extractInlineNotes(text);
	text = afterNotes;
	const { quantity, min, rest: afterQty } = parseLeadingQuantity(text);
	text = stripOf(afterQty, options.fillerWord);
	const { unit, remaining: afterUnit } = consumeUnit(text, options);
	// Without this a "1 cup/240 ml water" line left "/240 ml water" in the name.
	const { alt, remaining: afterAlt } = unit ? consumeAlternateMeasure(afterUnit, options) : { alt: undefined, remaining: afterUnit };
	text = stripOf(afterAlt, options.fillerWord).replace(/[,;:.]+$/, "").trim();
	// The qty and unit fields are free text, so a range goes in qty as "2-3"
	// and a second measure rides in the unit field as "cup / 240 ml". compose()
	// just joins the fields, so both re-parse and nothing is lost on save.
	const qty = quantity === null ? "" : min !== undefined ? `${min}-${quantity}` : String(quantity);
	const altText = alt ? ` / ${alt.quantityMin !== undefined ? `${alt.quantityMin}-` : ""}${alt.quantity} ${alt.unit}` : "";
	return { qty, unit: `${unit}${altText}`, name: text, note: note ?? "" };
}

export function composeIngredient(v: Record<string, string>): string {
	const name = v.name.trim();
	if (!name) return "";
	const parts = [v.qty.trim(), v.unit.trim(), name].filter(Boolean);
	let line = parts.join(" ");
	if (v.note.trim()) line += ` (${v.note.trim()})`;
	return line;
}
