import { describe, it, expect } from "vitest";
import { parseIngredientLine } from "../../src/parser/ingredient-parse";
import { stripListMarkers, stripOf } from "../../src/parser/ingredient-clean";
import { compileVocabulary, ENGLISH_VOCABULARY } from "../../src/parser/unit-table";

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
