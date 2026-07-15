import { describe, it, expect } from "vitest";
import { extractRecipeFromText } from "../../src/importer/text-recipe-parse";

describe("extractRecipeFromText", () => {
	it("detects a markdown heading as the title", () => {
		const text = "# Chicken Alfredo\n\nSome description.";
		expect(extractRecipeFromText(text).title).toBe("Chicken Alfredo");
	});

	it("uses a titleOverride when provided, skipping title detection", () => {
		const text = "# Ignored Heading\n\nDescription.";
		expect(extractRecipeFromText(text, "Custom Title").title).toBe("Custom Title");
	});

	it("splits ingredients and instructions by recognized section headings", () => {
		const text = [
			"Chicken Alfredo",
			"Ingredients:",
			"- 2 cups pasta",
			"- 1 cup cream",
			"Instructions:",
			"1. Boil pasta.",
			"2. Add cream.",
		].join("\n");
		const recipe = extractRecipeFromText(text);
		// Unlike instruction steps, ingredient lines are not marker-stripped --
		// buildIngredientGroups keeps the raw "- " prefix as-is.
		expect(recipe.ingredientGroups).toEqual([{ name: null, items: ["- 2 cups pasta", "- 1 cup cream"] }]);
		expect(recipe.instructionGroups).toEqual([{ name: null, items: ["Boil pasta.", "Add cream."] }]);
	});

	it("falls back to putting everything in the description when no sections are found", () => {
		const text = "Just a title\nSome random unstructured text.";
		const recipe = extractRecipeFromText(text);
		expect(recipe.ingredientGroups).toEqual([]);
		expect(recipe.instructionGroups).toEqual([]);
		expect(recipe.description).toContain("Some random unstructured text.");
	});

	it("extracts loose servings, time, and nutrition metadata from free text", () => {
		const text = "Recipe\nServes 4\nPrep time: 10 minutes\nCook time: 20 minutes\nCalories: 350\nProtein: 25g";
		const recipe = extractRecipeFromText(text);
		expect(recipe.servings).toBe("4");
		expect(recipe.prepTime).toBe(10);
		expect(recipe.cookTime).toBe(20);
		expect(recipe.calories).toBe(350);
		expect(recipe.protein).toBe(25);
	});

	it("converts a time given in hours to minutes", () => {
		const text = "Recipe\nTotal time: 1.5 hours";
		expect(extractRecipeFromText(text).totalTime).toBe(90);
	});

	it("decodes HTML entities and strips HTML tags from the input", () => {
		const text = "Mom&#39;s Recipe\nIngredients:\n- <b>2 cups</b> flour";
		const recipe = extractRecipeFromText(text);
		expect(recipe.title).toBe("Mom's Recipe");
		expect(recipe.ingredientGroups[0].items[0]).toBe("- 2 cups flour");
	});

	it("detects an ALL-CAPS or colon-suffixed line as an ingredient sub-heading", () => {
		const text = "Recipe\nIngredients:\nDOUGH:\n- flour\nFILLING:\n- sugar";
		const recipe = extractRecipeFromText(text);
		expect(recipe.ingredientGroups).toEqual([
			{ name: "DOUGH", items: ["- flour"] },
			{ name: "FILLING", items: ["- sugar"] },
		]);
	});

	it("strips ordered/unordered markers from instruction steps", () => {
		const text = "Recipe\nInstructions:\n1. Mix.\n- Bake.";
		const recipe = extractRecipeFromText(text);
		expect(recipe.instructionGroups[0].items).toEqual(["Mix.", "Bake."]);
	});

	it("always returns empty notesGroups (text-mode import has no notes detection)", () => {
		const text = "Recipe\nIngredients:\n- flour";
		expect(extractRecipeFromText(text).notesGroups).toEqual([]);
	});
});
