/**
 * Parses a Start-timer modal duration field: tries the strict mm:ss / bare-minutes
 * format first (parseTimeInput), then falls back to the same natural-language
 * duration matcher used for inline recipe text ("1 hour 30 min", "90 seconds"),
 * so users can type either a stopwatch-style value or a spoken-style phrase.
 */
import { DURATION_RE, matchToSeconds } from "./duration-detect";
import { parseTimeInput } from "./time-format";

export function parseDurationInput(raw: string, rangeDefault: "min" | "max"): number | null {
	const direct = parseTimeInput(raw);
	if (direct !== null) return direct;

	DURATION_RE.lastIndex = 0;
	const match = DURATION_RE.exec(raw);
	if (!match) return null;

	const seconds = matchToSeconds(match, rangeDefault);
	return seconds > 0 ? seconds : null;
}
