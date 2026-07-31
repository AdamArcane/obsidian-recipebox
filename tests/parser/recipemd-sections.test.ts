import { describe, it, expect } from "vitest";
import { findRecipeMdIngredients } from "../../src/parser/recipemd-sections";
import { extractIngredientLines } from "../../src/parser/recipe-ingredients";
import { splitBodyAroundIngredients } from "../../src/parser/recipe-ingredient-groups";

const RECIPE_MD = [
	"# Bolonhesa",
	"",
	"---",
	"",
	"- *400 g* carne picada",
	"- *1* cebola",
	"",
	"---",
	"",
	"1. Refogar a cebola.",
	"2. Juntar a carne.",
].join("\n");

const WITH_HEADING = [
	"## Ingredients",
	"- 2 cups flour",
	"## Instructions",
	"1. Mix.",
].join("\n");

const NO_STRUCTURE = ["- 2 cups flour", "1. Mix."].join("\n");

describe("findRecipeMdIngredients", () => {
	it("returns the block between the first two thematic breaks", () => {
		expect(findRecipeMdIngredients(RECIPE_MD.split("\n"))).toEqual({ start: 3, end: 7 });
	});

	it("accepts the other thematic break styles", () => {
		expect(findRecipeMdIngredients(["a", "***", "- x", "___", "b"])).toEqual({ start: 2, end: 3 });
	});

	it("ignores a note with a single horizontal rule", () => {
		expect(findRecipeMdIngredients(["a", "---", "- x"])).toBeNull();
	});
});

describe("extractIngredientLines without a heading", () => {
	it("returns only the RecipeMD ingredient block, not the instructions", () => {
		expect(extractIngredientLines(RECIPE_MD, "Ingredients")).toEqual([
			"- *400 g* carne picada",
			"- *1* cebola",
		]);
	});

	it("still prefers an explicit heading when one exists", () => {
		expect(extractIngredientLines(WITH_HEADING, "Ingredients")).toEqual(["- 2 cups flour"]);
	});

	it("keeps the catch-all fallback for notes with neither", () => {
		expect(extractIngredientLines(NO_STRUCTURE, "Ingredients")).toEqual(["- 2 cups flour", "1. Mix."]);
	});
});

describe("splitBodyAroundIngredients without a heading", () => {
	it("yields one group from the RecipeMD block", () => {
		const split = splitBodyAroundIngredients(RECIPE_MD, "Ingredients");
		expect(split.groups).toEqual([
			{ heading: null, lines: ["- *400 g* carne picada", "- *1* cebola"] },
		]);
		expect(split.before).toContain("# Bolonhesa");
		expect(split.after).toContain("1. Refogar a cebola.");
	});

	it("returns no groups when the note is neither RecipeMD nor headed", () => {
		expect(splitBodyAroundIngredients(NO_STRUCTURE, "Ingredients").groups).toEqual([]);
	});
});
