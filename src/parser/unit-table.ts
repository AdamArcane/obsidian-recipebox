/**
 * Compiles the built-in English units, a selected locale's vocabulary and the
 * user's aliases into the lookup tables the parser needs. Compile once per
 * operation and thread the result down, the way the GI dictionary is handled.
 */
import { UNIT_SYNONYMS } from "./ingredient-units";
import { getLocale } from "./locales";
import { compileUnitAliases } from "./unit-aliases";

/** Normalised phrase to the text shown to the user. */
export interface PhraseTable {
	forms: Map<string, string>;
	/** Longest phrase in words, so matchers know how far ahead to look. */
	maxWords: number;
}

/** Normalised phrase to its numeric value. */
export interface NumeralTable {
	forms: Map<string, number>;
	maxWords: number;
}

export interface ParseVocabulary {
	units: PhraseTable;
	/** Size and preparation words moved out of the name and into the note. */
	qualifiers: PhraseTable;
	numerals: NumeralTable;
	/** Stripped between a unit and its ingredient, like the English "of". */
	prepositions: readonly string[];
}

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases, strips accents and periods, and collapses whitespace, so "C. Sopa",
 * "c.  sopa" and "c sopa" all reach the same key. Matching is done on whole words
 * rather than character offsets because stripping accents changes string length.
 */
export function normalisePhrase(text: string): string {
	return text
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(/\./g, "")
		.trim()
		.replace(/\s+/g, " ");
}

/** Builds a table from layers, highest precedence first. */
function buildTable(layers: Record<string, string>[]): PhraseTable {
	const forms = new Map<string, string>();
	for (const layer of layers) {
		for (const [form, value] of Object.entries(layer)) {
			const key = normalisePhrase(form);
			if (key && !forms.has(key)) forms.set(key, value);
		}
	}

	let maxWords = 1;
	for (const key of forms.keys()) maxWords = Math.max(maxWords, key.split(" ").length);

	return { forms, maxWords };
}

export function compileUnitTable(localeId: string, aliasText: string): PhraseTable {
	const locale = getLocale(localeId);
	const suppressed = new Set((locale?.suppress ?? []).map(normalisePhrase));

	const english: Record<string, string> = {};
	for (const [form, unit] of Object.entries(UNIT_SYNONYMS)) {
		if (!suppressed.has(normalisePhrase(form))) english[form] = unit;
	}

	return buildTable([compileUnitAliases(aliasText).forms, locale?.forms ?? {}, english]);
}

export function compileQualifierTable(localeId: string): PhraseTable {
	const qualifiers = getLocale(localeId)?.qualifiers ?? [];
	// A qualifier maps to itself: the original wording is what lands in the note.
	return buildTable([Object.fromEntries(qualifiers.map((q) => [q, q]))]);
}

export function compileNumeralTable(localeId: string): NumeralTable {
	const forms = new Map<string, number>();
	let maxWords = 1;
	for (const [word, value] of Object.entries(getLocale(localeId)?.numerals ?? {})) {
		const key = normalisePhrase(word);
		if (!key) continue;
		forms.set(key, value);
		maxWords = Math.max(maxWords, key.split(" ").length);
	}
	return { forms, maxWords };
}

export function compileVocabulary(localeId: string, aliasText: string): ParseVocabulary {
	return {
		units: compileUnitTable(localeId, aliasText),
		qualifiers: compileQualifierTable(localeId),
		numerals: compileNumeralTable(localeId),
		prepositions: getLocale(localeId)?.prepositions ?? [],
	};
}

/** The built-in English vocabulary with no locale or user aliases applied. */
export const ENGLISH_VOCABULARY: ParseVocabulary = compileVocabulary("en", "");

/** Convenience for the many call sites that hold settings and need a vocabulary. */
export function vocabularyFromSettings(settings: { recipeLocale: string; unitAliases: string }): ParseVocabulary {
	return compileVocabulary(settings.recipeLocale, settings.unitAliases);
}
