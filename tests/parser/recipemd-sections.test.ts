import { describe, it, expect } from "vitest";
import { findRecipeMdIngredients } from "../../src/parser/recipemd-sections";
import { extractIngredientLines } from "../../src/parser/recipe-ingredients";
import { splitBodyAroundIngredients } from "../../src/parser/recipe-ingredient-groups";
import { splitBodyAroundInstructions } from "../../src/parser/recipe-instruction-groups";

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

	it("treats a lone break followed only by bullets as an instruction-less recipe", () => {
		expect(findRecipeMdIngredients(["a", "---", "- x"])).toEqual({ start: 2, end: 3 });
	});

	it("ignores a lone break when what follows is not an ingredient list", () => {
		expect(findRecipeMdIngredients(["a", "---", "some prose"])).toBeNull();
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

const GROUPED = [
	"# Cake", "", "---", "",
	"## Dough", "- *200 g* flour",
	"## Filling", "- *100 g* jam",
	"", "---", "", "1. Bake.",
].join("\n");

const NO_INSTRUCTIONS = ["# Salad", "", "---", "", "- *1* lettuce", "- *2* tomatoes"].join("\n");

const RULE_THEN_PROSE = ["# Note", "", "---", "", "Some prose.", "", "1. A step."].join("\n");

describe("RecipeMD spec conformance", () => {
	it("titles ingredient groups from headings inside the block", () => {
		expect(splitBodyAroundIngredients(GROUPED, "Ingredients").groups).toEqual([
			{ heading: "Dough", lines: ["- *200 g* flour"] },
			{ heading: "Filling", lines: ["- *100 g* jam"] },
		]);
	});

	it("accepts an omitted closing break when the recipe has no instructions", () => {
		expect(findRecipeMdIngredients(NO_INSTRUCTIONS.split("\n"))).toEqual({ start: 3, end: 6 });
		expect(extractIngredientLines(NO_INSTRUCTIONS, "Ingredients")).toEqual(["- *1* lettuce", "- *2* tomatoes"]);
	});

	it("does not mistake an ordinary horizontal rule for an ingredient block", () => {
		expect(findRecipeMdIngredients(RULE_THEN_PROSE.split("\n"))).toBeNull();
	});

	it("still requires at least one ingredient after a lone break", () => {
		expect(findRecipeMdIngredients(["# T", "---", "", ""])).toBeNull();
	});
});

describe("RecipeMD instructions", () => {
	it("flags a RecipeMD split and hands on the method without the closing break", () => {
		const split = splitBodyAroundIngredients(RECIPE_MD, "Ingredients");
		expect(split.isRecipeMd).toBe(true);
		expect(split.after.trim().startsWith("---")).toBe(false);
		expect(split.after).toContain("1. Refogar a cebola.");
	});

	it("does not flag a heading-based note", () => {
		expect(splitBodyAroundIngredients(WITH_HEADING, "Ingredients").isRecipeMd).toBe(false);
	});

	it("treats everything after the block as one unnamed instruction group", () => {
		const split = splitBodyAroundIngredients(RECIPE_MD, "Ingredients");
		const instructions = splitBodyAroundInstructions(split.after, "Instructions", split.isRecipeMd);
		expect(instructions.groups).toEqual([
			{ heading: null, headingLevel: 0, steps: ["Refogar a cebola.", "Juntar a carne."] },
		]);
	});

	it("leaves the same text alone when the note is not RecipeMD", () => {
		const split = splitBodyAroundIngredients(RECIPE_MD, "Ingredients");
		expect(splitBodyAroundInstructions(split.after, "Instructions", false).groups).toEqual([]);
	});

	it("yields no instructions for a recipe that has none", () => {
		const split = splitBodyAroundIngredients(NO_INSTRUCTIONS, "Ingredients");
		expect(splitBodyAroundInstructions(split.after, "Instructions", split.isRecipeMd).groups).toEqual([]);
	});
});
