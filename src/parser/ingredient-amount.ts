/**
 * Scales and formats an ingredient's amount, including a range ("2-3") and a
 * second measure ("/ 4 oz"), so the recipe view and the markdown rescaler agree.
 */
import type { AlternateMeasure, ParsedIngredient } from "../types";
import { formatQuantity } from "./quantity-format";

export interface ScaledAmount {
	/** "2-3", "1 1/2" or "" when the ingredient has no quantity. */
	text: string;
	alt: { text: string; unit: string } | null;
}

function formatAlt(alt: AlternateMeasure, multiplier: number): { text: string; unit: string } {
	return { text: formatQuantity(alt.quantity * multiplier), unit: alt.unit };
}

/**
 * `separator` is the range joiner: an en dash for display, a plain hyphen when
 * rebuilding markdown so the line re-parses without relying on dash handling.
 */
export function scaleAmount(parsed: ParsedIngredient, multiplier: number, separator = "–"): ScaledAmount {
	let text = "";
	if (parsed.quantity !== null) {
		const high = formatQuantity(parsed.quantity * multiplier);
		const low = parsed.quantityMin !== undefined ? formatQuantity(parsed.quantityMin * multiplier) : "";
		// Both ends can round to the same display value at small multipliers
		// ("1-1" at 0.1x); show a single number rather than a degenerate range.
		text = low && low !== high ? `${low}${separator}${high}` : high;
	}
	return { text, alt: parsed.alt ? formatAlt(parsed.alt, multiplier) : null };
}
