/**
 * Scales and formats an ingredient's amount, including a range ("2-3") and a
 * second measure ("/ 4 oz", itself possibly a range), so the recipe view, the
 * markdown rescaler and the exports agree.
 */
import type { AlternateMeasure, ParsedIngredient } from "../types";
import { formatQuantity } from "./quantity-format";

export interface ScaledAmount {
	/** "2-3", "1 1/2" or "" when the ingredient has no quantity. */
	text: string;
	alt: { text: string; unit: string } | null;
}

function formatRange(max: number, min: number | undefined, multiplier: number, separator: string, unit: string): string {
	const high = formatQuantity(max * multiplier, unit);
	const low = min !== undefined ? formatQuantity(min * multiplier, unit) : "";
	// Both ends can round to the same display value at small multipliers
	// ("1-1" at 0.1x); show a single number rather than a degenerate range.
	return low && low !== high ? `${low}${separator}${high}` : high;
}

/**
 * `separator` is the range joiner: an en dash for display, a plain hyphen when
 * rebuilding markdown so the line re-parses without relying on dash handling.
 */
export function scaleAmount(parsed: ParsedIngredient, multiplier: number, separator = "\u2013"): ScaledAmount {
	const text = parsed.quantity !== null ? formatRange(parsed.quantity, parsed.quantityMin, multiplier, separator, parsed.unit) : "";
	const alt = parsed.alt
		? { text: formatRange(parsed.alt.quantity, parsed.alt.quantityMin, multiplier, separator, parsed.alt.unit), unit: parsed.alt.unit }
		: null;
	return { text, alt };
}

/**
 * Numeric fields of an ingredient multiplied out, for the exports, which carry
 * raw numbers rather than display text. Optional fields are left off when
 * absent so unranged ingredients keep their old shape.
 */
export function scaleNumbers(
	parsed: ParsedIngredient,
	multiplier: number
): Pick<ParsedIngredient, "quantity" | "quantityMin" | "alt"> {
	const result: Pick<ParsedIngredient, "quantity" | "quantityMin" | "alt"> = {
		quantity: parsed.quantity !== null ? parsed.quantity * multiplier : null,
	};
	if (parsed.quantityMin !== undefined) result.quantityMin = parsed.quantityMin * multiplier;
	if (parsed.alt) {
		const alt: AlternateMeasure = { quantity: parsed.alt.quantity * multiplier, unit: parsed.alt.unit };
		if (parsed.alt.quantityMin !== undefined) alt.quantityMin = parsed.alt.quantityMin * multiplier;
		result.alt = alt;
	}
	return result;
}
