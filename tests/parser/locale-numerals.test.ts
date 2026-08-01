import { describe, it, expect } from "vitest";
import { parseIngredientLine } from "../../src/parser/ingredient-parse";
import { stripListMarkers, stripOf } from "../../src/parser/ingredient-clean";
import { compileVocabulary, ENGLISH_VOCABULARY } from "../../src/parser/vocabulary";

const PT = compileVocabulary("pt-PT", "");

describe("stripListMarkers", () => {
	it("strips a bullet glyph left behind by a copy-paste", () => {
		expect(stripListMarkers("- • 500g bacalhau")).toBe("500g bacalhau");
		expect(stripListMarkers("• 2 ovos")).toBe("2 ovos");
	});
});

describe("stripOf", () => {
	it("still strips only 'of' when the locale supplies no prepositions", () => {
		expect(stripOf("de tomates")).toBe("de tomates");
		expect(stripOf("of sugar")).toBe("sugar");
	});

	it("strips a locale preposition", () => {
		expect(stripOf("de tomates", PT.prepositions)).toBe("tomates");
		expect(stripOf("das ervas", PT.prepositions)).toBe("ervas");
	});

	it("leaves a name that merely starts with those letters", () => {
		expect(stripOf("demolhado bacalhau", PT.prepositions)).toBe("demolhado bacalhau");
	});
});

describe("spelled-out numerals", () => {
	it("reads locale number words as amounts", () => {
		expect(parseIngredientLine("- Uma cebola roxa", PT)).toMatchObject({ quantity: 1, name: "cebola roxa" });
		expect(parseIngredientLine("- Duas batatas doces", PT)).toMatchObject({ quantity: 2, name: "batatas doces" });
		expect(parseIngredientLine("- Cinco ovos", PT)).toMatchObject({ quantity: 5, name: "ovos" });
	});

	it("handles fractional words and prefers the longer phrase", () => {
		expect(parseIngredientLine("- Meia lata de atum", PT)).toMatchObject({ quantity: 0.5, unit: "lata", name: "atum" });
	});

	// dúzia was a numeral, so it was consumed before consumeUnit ever ran and the
	// digit in front of it was thrown away: "1 dúzia de ovos" became a bare 1 and
	// "meia dúzia" became 0.5 of an ingredient called "dúzia de ovos". As a unit it
	// behaves like the English "dozen" in all three positions.
	it("reads a multiplier-noun as a unit in every position", () => {
		expect(parseIngredientLine("- dúzia de ovos", PT)).toMatchObject({ quantity: null, unit: "dúzia", name: "ovos" });
		expect(parseIngredientLine("- 1 dúzia de ovos", PT)).toMatchObject({ quantity: 1, unit: "dúzia", name: "ovos" });
		expect(parseIngredientLine("- meia dúzia de ovos", PT)).toMatchObject({ quantity: 0.5, unit: "dúzia", name: "ovos" });
	});

	// A plural unit form is a spelling of the same unit, never a multiplier on the
	// amount in front of it: "2 dúzias" is a quantity of two dozen, not of 24. The
	// canonical form is singular, so the plural has to survive the round trip as
	// the quantity the recipe actually wrote.
	it("never lets a plural unit form multiply the amount", () => {
		expect(parseIngredientLine("- 2 dúzias de ovos", PT)).toMatchObject({ quantity: 2, unit: "dúzia", name: "ovos" });
		expect(parseIngredientLine("- 3 colheres de sopa de azeite", PT)).toMatchObject({ quantity: 3, unit: "c. sopa", name: "azeite" });
		expect(parseIngredientLine("- 4 dentes de alho", PT)).toMatchObject({ quantity: 4, unit: "dente", name: "alho" });
		expect(parseIngredientLine("- 2 dozen eggs", ENGLISH_VOCABULARY)).toMatchObject({ quantity: 2, unit: "dozen", name: "eggs" });
		expect(parseIngredientLine("- Um quarto de couve-flor", PT)).toMatchObject({ quantity: 0.25, name: "couve-flor" });
	});

	it("does not treat a numeral as an amount when nothing follows it", () => {
		expect(parseIngredientLine("- Uma", PT)).toMatchObject({ quantity: null, name: "uma" });
	});

	it("leaves English parsing untouched", () => {
		expect(parseIngredientLine("- a pinch of salt", ENGLISH_VOCABULARY)).toMatchObject({ quantity: 1, unit: "pinch", name: "salt" });
		expect(parseIngredientLine("- uma cebola", ENGLISH_VOCABULARY)).toMatchObject({ quantity: null });
	});
});
