import { describe, it, expect } from "vitest";
import { allLocales } from "../../src/parser/locales";
import { UNIT_SYNONYMS } from "../../src/parser/ingredient-units";
import { normalisePhrase } from "../../src/parser/phrase-normalise";

/**
 * Rules the RecipeLocale interface states but cannot express in its types. Each
 * one is here because breaking it produced a wrong amount rather than a missing
 * one, which is the failure mode the locale layer exists to prevent.
 */

const keys = (forms: Iterable<string>): Set<string> =>
	new Set([...forms].map(normalisePhrase).filter(Boolean));

const overlap = (a: Set<string>, b: Set<string>): string[] => [...a].filter((k) => b.has(k));

describe.each(allLocales().map((l) => [l.id, l] as const))("%s locale contract", (_id, locale) => {
	const forms = keys(Object.keys(locale.forms));
	const qualifiers = keys(locale.qualifiers ?? []);
	const numerals = keys(Object.keys(locale.numerals ?? {}));

	// A form in two tables parses differently depending on where it lands in the
	// line. "q.b." was both a unit and a qualifier, so "sal q.b." and "q.b. de sal"
	// produced two grocery entries for one bag of salt.
	it("keeps units and qualifiers disjoint", () => {
		expect(overlap(forms, qualifiers)).toEqual([]);
	});

	// Numerals are consumed before units, so a word in both is only ever read as a
	// numeral and the unit entry is dead.
	it("keeps units and numerals disjoint", () => {
		expect(overlap(forms, numerals)).toEqual([]);
	});

	it("keeps qualifiers and numerals disjoint", () => {
		expect(overlap(qualifiers, numerals)).toEqual([]);
	});

	// The rule is that a multiplier-noun belongs in forms, never in numerals: a
	// numeral standing between a digit and its noun shadows the digit, so with
	// "dúzia" as a numeral "1 dúzia de ovos" parsed as a bare 1 and "meia dúzia" as
	// 0.5 of nothing. English gets this right by treating "dozen" as a unit.
	//
	// The bound below is a proxy for that rule, not the rule itself, because
	// "multiplies a noun" cannot be read off a number. It is set where it is only
	// because a recipe amount is rarely a spelled-out cardinal above ten, so a large
	// value is usually a multiplier-noun in disguise. A locale that legitimately
	// spells out "vinte" is not a defect and should raise the bound.
	const CARDINAL_CEILING = 10;
	it("declares no multiplier-noun as a numeral", () => {
		for (const [word, value] of Object.entries(locale.numerals ?? {})) {
			expect(
				value,
				`"${word}" is ${value}. If it multiplies a noun, as dúzia does, move it to forms ` +
				`so it parses as a unit. If it is a plain spelled-out cardinal, raise CARDINAL_CEILING.`,
			).toBeLessThanOrEqual(CARDINAL_CEILING);
		}
	});

	// suppress only has meaning against the base table. A typo silently suppresses
	// nothing, which quietly restores the collision it was written to remove.
	it("suppresses only forms the base table actually carries", () => {
		const base = keys(Object.keys(UNIT_SYNONYMS));
		for (const form of locale.suppress ?? []) {
			expect(base.has(normalisePhrase(form)), `${form} is not in UNIT_SYNONYMS`).toBe(true);
		}
	});

	// Prepositions are interpolated into a regex in stripOf.
	it("declares prepositions as plain words", () => {
		for (const p of locale.prepositions ?? []) {
			expect(p, `${p} is not a plain word`).toMatch(/^[\p{L}]+$/u);
		}
	});
});
