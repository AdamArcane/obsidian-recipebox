/**
 * Compiles the built-in English units, a selected locale's vocabulary and the
 * user's aliases into one lookup table for consumeUnit. Compile once per
 * operation and thread the result down, the way the GI dictionary is handled.
 */
import { UNIT_SYNONYMS } from "./ingredient-units";
import { getLocaleUnits } from "./locales";
import { compileUnitAliases } from "./unit-aliases";

export interface UnitTable {
	/** Normalised unit form to canonical unit. */
	forms: Map<string, string>;
	/** Longest form in words, so consumeUnit knows how far ahead to look. */
	maxWords: number;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases, strips accents and periods, and collapses whitespace, so "C. Sopa",
 * "c.  sopa" and "c sopa" all reach the same key. Matching is done on whole words
 * rather than character offsets because stripping accents changes string length.
 */
export function normaliseUnitForm(text: string): string {
	return text
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(/\./g, "")
		.trim()
		.replace(/\s+/g, " ");
}

export function compileUnitTable(localeId: string, aliasText: string): UnitTable {
	const locale = getLocaleUnits(localeId);
	const suppressed = new Set((locale?.suppress ?? []).map(normaliseUnitForm));

	const english: Record<string, string> = {};
	for (const [form, unit] of Object.entries(UNIT_SYNONYMS)) {
		if (!suppressed.has(normaliseUnitForm(form))) english[form] = unit;
	}

	// Highest precedence first; a later layer never overwrites an earlier one.
	const layers = [compileUnitAliases(aliasText).forms, locale?.forms ?? {}, english];

	const forms = new Map<string, string>();
	for (const layer of layers) {
		for (const [form, unit] of Object.entries(layer)) {
			const key = normaliseUnitForm(form);
			if (key && !forms.has(key)) forms.set(key, unit);
		}
	}

	let maxWords = 1;
	for (const key of forms.keys()) {
		maxWords = Math.max(maxWords, key.split(" ").length);
	}

	return { forms, maxWords };
}

/** The built-in English vocabulary with no locale or user aliases applied. */
export const ENGLISH_UNITS: UnitTable = compileUnitTable("en", "");

/** Convenience for the many call sites that hold settings and need a table. */
export function unitsFromSettings(settings: { recipeLocale: string; unitAliases: string }): UnitTable {
	return compileUnitTable(settings.recipeLocale, settings.unitAliases);
}
