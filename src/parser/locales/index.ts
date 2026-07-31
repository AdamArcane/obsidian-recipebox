/**
 * Registry of recipe locales. English is the base vocabulary every locale falls
 * back to, so it has no entry of its own here.
 */
import { LocaleUnits } from "./locale-types";
import { PT_PT_UNITS } from "./pt-pt";

export type { LocaleUnits } from "./locale-types";

export const BASE_LOCALE_ID = "en";

const LOCALES: LocaleUnits[] = [PT_PT_UNITS];

/** Locale ids to labels, for the settings dropdown. English first. */
export function localeOptions(): Record<string, string> {
	const options: Record<string, string> = { [BASE_LOCALE_ID]: "English" };
	for (const l of LOCALES) options[l.id] = l.label;
	return options;
}

/** Returns null for English or an unknown id, both meaning "base vocabulary only". */
export function getLocaleUnits(id: string): LocaleUnits | null {
	return LOCALES.find((l) => l.id === id) ?? null;
}
