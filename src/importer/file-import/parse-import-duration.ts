/**
 * Converts a duration from an import file to whole minutes. ISO 8601
 * ("PT1H15M", schema.org style) is tried first, then free text ("15 minutes",
 * "1 hour 30 min", as Mealie stores it). Anything unparseable returns null so
 * the recipe still imports, just without that time.
 *
 * Reaches into ui/timer/ for the natural-language matcher; moving that matcher
 * to parser/ is a separate refactor, deliberately not bundled with this feature.
 */
import { parseDurationInput } from "../../ui/timer/parse-duration-input";

const ISO_DURATION_RE = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

export function parseImportDuration(raw: unknown): number | null {
	if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
	if (typeof raw !== "string") return null;
	const text = raw.trim();
	if (!text) return null;

	const iso = ISO_DURATION_RE.exec(text);
	// "P" and "PT" alone match the regex with every group empty; require at
	// least one component so they fall through to null rather than 0.
	if (iso && iso.slice(1).some(g => g !== undefined)) {
		const [d, h, m, s] = iso.slice(1).map(g => (g === undefined ? 0 : parseFloat(g)));
		const minutes = Math.round(d * 1440 + h * 60 + m + s / 60);
		return minutes > 0 ? minutes : null;
	}

	// The timer parser treats a bare number as minutes, which matches how
	// exporters write "15"; its result is in seconds.
	const seconds = parseDurationInput(text, "max");
	return seconds !== null ? Math.max(1, Math.round(seconds / 60)) : null;
}
