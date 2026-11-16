/**
 * Splits a grocery line such as "1 1/2 lb boneless chicken" into Pantry's
 * separate quantity ("1 1/2 lb") and name ("boneless chicken"). Pure.
 */
import { parseLeadingQuantity } from "../../parser/quantity-parse";
import { consumeUnit, IngredientParserOptions } from "../../parser/ingredient-parse";
import { stripOf } from "../../parser/ingredient-clean";

export interface SplitText {
	quantity: string;
	name: string;
}

/**
 * Why we slice the original text instead of rebuilding from the parsed number:
 * the user's own wording ("1 1/2", "2-3", "lbs") should arrive in Pantry
 * untouched, and Pantry treats quantity as free text anyway. When anything
 * looks off (no leading amount, nothing left for the name) the whole line is
 * kept as the name, which is exactly what was sent before this split existed.
 */
export function splitQuantity(line: string, options: IngredientParserOptions = {}): SplitText {
	// NFC to match consumeUnit, which normalizes before measuring what it consumed.
	const text = line.normalize("NFC").trim();
	const whole: SplitText = { quantity: "", name: text };

	const { quantity, rest: afterQty } = parseLeadingQuantity(text);
	if (quantity === null) return whole;

	const afterFiller = stripOf(afterQty, options.fillerWord);
	// The parser also strips a filler word after the unit ("2 cups of flour").
	const remaining = stripOf(consumeUnit(afterFiller, options).remaining, options.fillerWord);
	if (!remaining || !text.endsWith(remaining)) return whole;

	let qty = text.slice(0, text.length - remaining.length).trim();
	// "2 cups of flour": the filler word sits between unit and name, so it
	// ended up on the quantity side. Drop it so Pantry shows "2 cups".
	for (const word of (options.fillerWord ?? "of").split(",").map((w) => w.trim()).filter(Boolean)) {
		const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		qty = qty.replace(new RegExp(`\\s+${escaped}$`, "i"), "");
	}
	const name = remaining.trim();
	return qty && name ? { quantity: qty, name } : whole;
}
