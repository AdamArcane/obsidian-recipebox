/**
 * Display-only decimal separator localisation for quantities. Pure and
 * Obsidian-free: the caller supplies the locale. Never used when writing notes,
 * so the markdown stays parseable with either separator.
 */

// Intl is asked rather than hardcoding a list of comma locales, so new locales
// work without maintenance. An unknown or invalid locale falls back to a dot.
export function decimalSeparatorFor(locale: string | undefined): string {
	if (!locale) return ".";
	try {
		const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal");
		return part?.value ?? ".";
	} catch {
		return ".";
	}
}

// Only a dot between two digits is a decimal point, so text such as "1." or
// a unit abbreviation containing a dot is left alone.
export function localiseDecimals(text: string, separator: string): string {
	if (separator === ".") return text;
	return text.replace(/(\d)\.(\d)/g, `$1${separator}$2`);
}
