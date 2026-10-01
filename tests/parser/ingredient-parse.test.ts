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

	it("matches custom aliases by longest prefix and lets them override built-ins", () => {
		const customSynonyms = "cuillère à soupe, c. à s. -> tbsp\nc. ->";
		expect(consumeUnit("cuillère à soupe moutarde", { customSynonyms })).toEqual({ unit: "tbsp", remaining: "moutarde" });
		expect(consumeUnit("c. moutarde", { customSynonyms })).toEqual({ unit: "", remaining: "moutarde" });
	});

	it("does not interpret an abbreviated c. as cup by default", () => {
		expect(consumeUnit("c. flour")).toEqual({ unit: "", remaining: "c. flour" });
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

	it("supports a localized filler word and custom units", () => {
		expect(parseIngredientLine("1 cuillère à soupe de moutarde", {
		customSynonyms: "cuillère à soupe -> tbsp",
		fillerWord: "de",
	})).toMatchObject({ quantity: 1, unit: "tbsp", name: "moutarde" });
	});

	it("returns null for an empty or marker-only line", () => {
		expect(parseIngredientLine("")).toBeNull();
		expect(parseIngredientLine("- ")).toBeNull();
	});

	it("returns null when nothing but a quantity remains", () => {
		expect(parseIngredientLine("2")).toBeNull();
	});
});

describe("parseIngredientLine: trailing periods and separators after units", () => {
	it.each([
		["2 tbsp. sugar", 2, "tbsp", "sugar"],
		["1 lb. ground beef", 1, "lb", "ground beef"],
		["2 oz. cheese", 2, "oz", "cheese"],
		["1 l. milk", 1, "l", "milk"],
	])("parses %s with its unit", (line, quantity, unit, name) => {
		expect(parseIngredientLine(line)).toMatchObject({ quantity, unit, name });
	});

	it("still does not treat 'c.' as cup", () => {
		expect(parseIngredientLine("1 c. flour")).toMatchObject({ quantity: 1, unit: "", name: "c. flour" });
	});

	it("matches a custom period-terminated alias with a filler word", () => {
		expect(parseIngredientLine("2 c. à s. de sel", {
			customSynonyms: "c. à s. -> tbsp",
			fillerWord: "de",
		})).toMatchObject({ quantity: 2, unit: "tbsp", name: "sel" });
	});

	it("matches a custom abbreviation with a trailing period", () => {
		expect(parseIngredientLine("1 Essl. Zucker", { customSynonyms: "essl. -> tbsp" }))
			.toMatchObject({ quantity: 1, unit: "tbsp", name: "zucker" });
	});

	it("drops a comma directly after the unit", () => {
		expect(parseIngredientLine("3 lbs, trimmed beef")).toMatchObject({ quantity: 3, unit: "lb", name: "trimmed beef" });
	});
});

describe("filler word list, normalization and mapping parsing", () => {
	it("strips any word from a comma-separated filler list", () => {
		const options = { fillerWord: "of, de, di" };
		expect(parseIngredientLine("2 cups of flour", options)).toMatchObject({ name: "flour" });
		expect(parseIngredientLine("2 cups de farine", options)).toMatchObject({ name: "farine" });
		expect(parseIngredientLine("2 cups di farina", options)).toMatchObject({ name: "farina" });
	});

	it("strips nothing when the filler list is empty", () => {
		expect(parseIngredientLine("2 cups of flour", { fillerWord: "" })).toMatchObject({ name: "of flour" });
	});

	it("matches decomposed accents against a precomposed alias and vice versa", () => {
		const decomposed = "cuillère à soupe".normalize("NFD");
		const precomposed = "cuillère à soupe".normalize("NFC");
		expect(consumeUnit(`${decomposed} moutarde`, { customSynonyms: `${precomposed} -> tbsp` }))
			.toEqual({ unit: "tbsp", remaining: "moutarde" });
		expect(consumeUnit(`${precomposed} moutarde`, { customSynonyms: `${decomposed} -> tbsp` }))
			.toEqual({ unit: "tbsp", remaining: "moutarde" });
	});

	it("keeps everything after the first arrow as the canonical unit", () => {
		expect(consumeUnit("foo bar", { customSynonyms: "foo -> bar -> baz" })).toEqual({ unit: "bar -> baz", remaining: "bar" });
	});
});

