/**
 * Registry of recipe locales. English is the base vocabulary every locale falls
 * back to, so it has no entry of its own here.
 */
import { RecipeLocale } from "./locale-types";
import { PT_PT } from "./pt-pt";

export type { RecipeLocale } from "./locale-types";

export const BASE_LOCALE_ID = "en";

const LOCALES: RecipeLocale[] = [PT_PT];

/** Locale ids to labels, for the settings dropdown. English first. */
export function localeOptions(): Record<string, string> {
	const options: Record<string, string> = { [BASE_LOCALE_ID]: "English" };
	for (const l of LOCALES) options[l.id] = l.label;
	return options;
}

/** Returns null for English or an unknown id, both meaning "base vocabulary only". */
export function getLocale(id: string): RecipeLocale | null {
	return LOCALES.find((l) => l.id === id) ?? null;
}

/** Every registered locale, so the contract test can check all of them at once. */
export function allLocales(): readonly RecipeLocale[] {
	return LOCALES;
}
