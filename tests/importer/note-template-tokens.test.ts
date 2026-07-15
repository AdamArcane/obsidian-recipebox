import { describe, it, expect } from "vitest";
import { parseServingCount, buildTokenTable } from "../../src/importer/note-template-tokens";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { ExtractedRecipe } from "../../src/importer/recipe-extract-types";

function recipe(overrides: Partial<ExtractedRecipe> = {}): ExtractedRecipe {
	return {
		title: "Test Recipe",
		description: "A description.",
		heroImage: null,
		servings: "4 servings",
		prepTime: 10,
		cookTime: 20,
		totalTime: 30,
		ingredientGroups: [],
		instructionGroups: [],
		notesGroups: [],
		sourceUrl: "https://example.com",
		calories: 300,
		protein: 20,
		fat: 10,
		carbs: 40,
		...overrides,
	};
}

describe("parseServingCount", () => {
	it("extracts the leading number from a yield string", () => {
		expect(parseServingCount("4 servings")).toBe(4);
		expect(parseServingCount("Serves 6")).toBe(6);
	});

	it("returns null when there is no number or it's zero", () => {
		expect(parseServingCount("several")).toBeNull();
		expect(parseServingCount("0 servings")).toBeNull();
	});
});

describe("buildTokenTable", () => {
	it("carries over basic scalar fields as strings", () => {
		const tokens = buildTokenTable(recipe(), DEFAULT_SETTINGS);
		expect(tokens.title).toBe("Test Recipe");
		expect(tokens.prepTime).toBe("10");
		expect(tokens.servings).toBe("4 servings");
	});

	it("renders null numeric fields as empty strings", () => {
		const tokens = buildTokenTable(recipe({ prepTime: null }), DEFAULT_SETTINGS);
		expect(tokens.prepTime).toBe("");
	});

	it("passes nutrition through unscaled when nutritionSource is not 'recipe-total'", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "per-serving" as const };
		const tokens = buildTokenTable(recipe(), settings);
		expect(tokens.calories).toBe("300");
	});

	it("scales nutrition by serving count when nutritionSource is 'recipe-total'", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "recipe-total" as const };
		const tokens = buildTokenTable(recipe({ servings: "4 servings", calories: 100 }), settings);
		expect(tokens.calories).toBe("400");
	});

	it("falls back to unscaled nutrition when servings can't be parsed as a count", () => {
		const settings = { ...DEFAULT_SETTINGS, nutritionSource: "recipe-total" as const };
		const tokens = buildTokenTable(recipe({ servings: null, calories: 100 }), settings);
		expect(tokens.calories).toBe("100");
	});

	it("includes configured property/heading name tokens from settings", () => {
		const settings = { ...DEFAULT_SETTINGS, ingredientsHeading: "What You Need" };
		const tokens = buildTokenTable(recipe(), settings);
		expect(tokens.ingredientsHeading).toBe("What You Need");
	});
});
