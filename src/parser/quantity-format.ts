/**
 * Formats a numeric quantity for display, snapping near-integers and expressing
 * common fractions as "1 1/2" rather than "1.5". Metric units are the exception:
 * nobody measures "41 2/3 g", so they get plain decimals instead.
 */
const DENOMINATORS = [2, 3, 4, 6, 8];
const SNAP_TOLERANCE = 0.02;
const FRACTION_TOLERANCE = 0.04;

function nearestFraction(value: number): string | null {
	let best: { num: number; den: number; diff: number } | null = null;
	for (const den of DENOMINATORS) {
		const num = Math.round(value * den);
		const diff = Math.abs(value - num / den);
		if (diff <= FRACTION_TOLERANCE) {
			if (!best || diff < best.diff || (diff === best.diff && den < best.den)) {
				best = { num, den, diff };
			}
		}
	}
	return best ? `${best.num}/${best.den}` : null;
}

// Canonical unit spellings (see ingredient-units.ts) that read as decimals.
const METRIC_UNITS = new Set(["g", "kg", "mg", "ml", "l"]);

// Precision shrinks as the amount grows: 12.5 g yeast and 0.25 l stock are
// amounts the author wrote and must survive at 1x, while 630.666 ml is only
// noise from scaling. Trailing zeros are trimmed so whole values stay "2".
// The 3-decimal fallback stops a tiny nonzero amount (0.004 g) rounding to "0".
function formatMetric(qty: number): string {
	const abs = Math.abs(qty);
	const sign = qty < 0 ? "-" : "";
	if (abs >= 100) return `${sign}${Math.round(abs)}`;
	const places = abs >= 10 ? 1 : 2;
	const rounded = parseFloat(abs.toFixed(places));
	if (rounded > 0) return `${sign}${rounded}`;
	return `${sign}${parseFloat(abs.toFixed(3))}`;
}

export function formatQuantity(qty: number | null, unit = ""): string {
	if (qty === null || isNaN(qty)) return "";
	if (qty === 0) return "0";
	if (METRIC_UNITS.has(unit)) return formatMetric(qty);

	const negative = qty < 0;
	const abs = Math.abs(qty);
	const prefix = negative ? "-" : "";

	const whole = Math.floor(abs);
	const frac = abs - whole;

	if (Math.abs(frac) <= SNAP_TOLERANCE) return `${prefix}${whole}`;
	if (Math.abs(frac - 1) <= SNAP_TOLERANCE) return `${prefix}${whole + 1}`;

	const fracStr = nearestFraction(frac);

	if (fracStr) {
		return whole > 0 ? `${prefix}${whole} ${fracStr}` : `${prefix}${fracStr}`;
	}

	return `${prefix}${abs.toFixed(2)}`;
}
