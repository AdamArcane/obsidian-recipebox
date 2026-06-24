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

export function formatQuantity(qty: number | null): string {
	if (qty === null || isNaN(qty)) return "";
	if (qty === 0) return "0";

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
