import { describe, it, expect } from "vitest";
import { ENGLISH_UNITS, compileUnitTable } from "../../src/parser/unit-table";
import { parseIngredientLine, consumeUnit } from "../../src/parser/ingredient-parse";

describe("consumeUnit", () => {
	it("recognizes a known unit synonym", () => {
		expect(consumeUnit("cups flour", ENGLISH_UNITS)).toEqual({ unit: "cup", remaining: "flour" });
	});

	it("recognizes the two-word 'fluid ounces' form", () => {
		expect(consumeUnit("fluid ounces milk", ENGLISH_UNITS)).toEqual({ unit: "fl oz", remaining: "milk" });
	});

	it("returns an empty unit when the leading token isn't a known unit", () => {
		expect(consumeUnit("large eggs", ENGLISH_UNITS)).toEqual({ unit: "", remaining: "large eggs" });
	});
});

describe("parseIngredientLine", () => {
	it("parses a full ingredient line with quantity, unit, and name", () => {
		expect(parseIngredientLine("2 cups flour", ENGLISH_UNITS)).toEqual({
			quantity: 2,
			unit: "cup",
			name: "flour",
			note: null,
			tags: [],
			raw: "2 cups flour",
		});
	});

	it("parses quantity, unit, name, inline note, and tags together", () => {
		expect(parseIngredientLine("- 1 1/2 cups flour (sifted) #pantry", ENGLISH_UNITS)).toEqual({
			quantity: 1.5,
			unit: "cup",
			name: "flour",
			note: "sifted",
			tags: ["pantry"],
			raw: "- 1 1/2 cups flour (sifted) #pantry",
		});
	});

	it("parses a name-only line with no quantity or unit", () => {
		expect(parseIngredientLine("salt to taste", ENGLISH_UNITS)).toEqual({
			quantity: null,
			unit: "",
			name: "salt to taste",
			note: null,
			tags: [],
			raw: "salt to taste",
		});
	});

	it("strips 'of' after quantity and after unit", () => {
		expect(parseIngredientLine("2 cups of flour", ENGLISH_UNITS)).toMatchObject({ name: "flour" });
	});

	it("returns null for an empty or marker-only line", () => {
		expect(parseIngredientLine("", ENGLISH_UNITS)).toBeNull();
		expect(parseIngredientLine("- ", ENGLISH_UNITS)).toBeNull();
	});

	it("returns null when nothing but a quantity remains", () => {
		expect(parseIngredientLine("2", ENGLISH_UNITS)).toBeNull();
	});
});

describe("consumeUnit with a locale table", () => {
	const PT = compileUnitTable("pt-PT", "");

	it("prefers the longest matching form", () => {
		expect(consumeUnit("colher de sopa azeite", PT)).toEqual({ unit: "c. sopa", remaining: "azeite" });
		expect(consumeUnit("colheres de sopa azeite", PT)).toEqual({ unit: "c. sopa", remaining: "azeite" });
	});

	it("matches abbreviations regardless of periods, accents or extra spaces", () => {
		expect(consumeUnit("c. sopa azeite", PT).unit).toBe("c. sopa");
		expect(consumeUnit("c.  sopa azeite", PT).unit).toBe("c. sopa");
		expect(consumeUnit("c. cha sal", PT).unit).toBe("c. chá");
		expect(consumeUnit("c. chá sal", PT).unit).toBe("c. chá");
	});

	it("does not read a lone Portuguese 'c.' as an English cup", () => {
		expect(consumeUnit("c. açúcar", PT)).toEqual({ unit: "", remaining: "c. açúcar" });
		expect(consumeUnit("c. sugar", ENGLISH_UNITS).unit).toBe("cup");
	});

	it("still resolves multi-word English units without a special case", () => {
		expect(consumeUnit("fluid ounces milk", ENGLISH_UNITS)).toEqual({ unit: "fl oz", remaining: "milk" });
	});

	it("parses a full Portuguese ingredient line", () => {
		expect(parseIngredientLine("- *2* dentes de alho", PT)).toMatchObject({ quantity: 2, unit: "dente", name: "alho" });
		expect(parseIngredientLine("- *1 c. sopa* azeite", PT)).toMatchObject({ quantity: 1, unit: "c. sopa", name: "azeite" });
	});
});
