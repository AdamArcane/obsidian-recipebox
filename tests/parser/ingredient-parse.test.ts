import { describe, it, expect } from "vitest";
import { parseIngredientLine, consumeUnit } from "../../src/parser/ingredient-parse";

describe("consumeUnit", () => {
	it("recognizes a known unit synonym", () => {
		expect(consumeUnit("cups flour")).toEqual({ unit: "cup", remaining: "flour" });
	});

	it("recognizes the two-word 'fluid ounces' form", () => {
		expect(consumeUnit("fluid ounces milk")).toEqual({ unit: "fl oz", remaining: "milk" });
	});

	it("returns an empty unit when the leading token isn't a known unit", () => {
		expect(consumeUnit("large eggs")).toEqual({ unit: "", remaining: "large eggs" });
	});
});

describe("parseIngredientLine", () => {
	it("parses a full ingredient line with quantity, unit, and name", () => {
		expect(parseIngredientLine("2 cups flour")).toEqual({
			quantity: 2,
			unit: "cup",
			name: "flour",
			note: null,
			tags: [],
			raw: "2 cups flour",
		});
	});

	it("parses quantity, unit, name, inline note, and tags together", () => {
		expect(parseIngredientLine("- 1 1/2 cups flour (sifted) #pantry")).toEqual({
			quantity: 1.5,
			unit: "cup",
			name: "flour",
			note: "sifted",
			tags: ["pantry"],
			raw: "- 1 1/2 cups flour (sifted) #pantry",
		});
	});

	it("parses a name-only line with no quantity or unit", () => {
		expect(parseIngredientLine("salt to taste")).toEqual({
			quantity: null,
			unit: "",
			name: "salt to taste",
			note: null,
			tags: [],
			raw: "salt to taste",
		});
	});

	it("strips 'of' after quantity and after unit", () => {
		expect(parseIngredientLine("2 cups of flour")).toMatchObject({ name: "flour" });
	});

	it("returns null for an empty or marker-only line", () => {
		expect(parseIngredientLine("")).toBeNull();
		expect(parseIngredientLine("- ")).toBeNull();
	});

	it("returns null when nothing but a quantity remains", () => {
		expect(parseIngredientLine("2")).toBeNull();
	});
});
