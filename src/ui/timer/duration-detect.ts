// Range patterns must appear before single-value patterns so "10-15 minutes"
// or "10 to 15 minutes" isn't partially consumed by the plain-minutes branch first.
// Groups: (1,2) hour range · (3,4) min range · (5,6) sec range
//         (7,8) hours+opt-minutes · (9) plain minutes · (10) plain seconds
const SEP = String.raw`\s*(?:[-–]|\bto\b)\s*`;
export const DURATION_RE = new RegExp(
	String.raw`\b(\d+(?:\.\d+)?)${SEP}(\d+(?:\.\d+)?)\s*hours?\b` +
	String.raw`|\b(\d+(?:\.\d+)?)${SEP}(\d+(?:\.\d+)?)\s*min(?:utes?)?\b` +
	String.raw`|\b(\d+(?:\.\d+)?)${SEP}(\d+(?:\.\d+)?)\s*sec(?:onds?)?\b` +
	String.raw`|\b(\d+(?:\.\d+)?)\s*hours?\b(?:\s*(\d+(?:\.\d+)?)\s*min(?:utes?)?\b)?` +
	String.raw`|\b(\d+(?:\.\d+)?)\s*min(?:utes?)?\b` +
	String.raw`|\b(\d+(?:\.\d+)?)\s*sec(?:onds?)?\b`,
	"gi",
);

function r(s: string): number { return Math.round(parseFloat(s)); }

function pickBound(loSec: number, hiSec: number, pref: "min" | "max"): number {
	return pref === "max" ? Math.max(loSec, hiSec) : Math.min(loSec, hiSec);
}

export function matchToSeconds(m: RegExpExecArray, rangeDefault: "min" | "max"): number {
	if (m[1]) return pickBound(r(m[1]) * 3600, r(m[2]) * 3600, rangeDefault);
	if (m[3]) return pickBound(r(m[3]) * 60,   r(m[4]) * 60,   rangeDefault);
	if (m[5]) return pickBound(r(m[5]),         r(m[6]),         rangeDefault);
	if (m[7]) return r(m[7]) * 3600 + (m[8] ? r(m[8]) * 60 : 0);
	if (m[9]) return r(m[9]) * 60;
	if (m[10]) return r(m[10]);
	return 0;
}
