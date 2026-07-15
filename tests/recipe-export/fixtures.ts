import type { RecipeExportData, RecipeExportOptions } from "../../src/recipe-export/recipe-export-data";

export function makeExportData(overrides: Partial<RecipeExportData> = {}): RecipeExportData {
	return {
		title: "Test Recipe",
		servings: 4,
		multiplier: 1,
		meta: {
			diet: [],
			allergens: [],
			times: { prep: null, cook: null, total: null },
			favorite: false,
			cookedCount: 0,
			lastMade: null,
		},
		ingredientGroups: [{ heading: null, lines: ["2 cups flour", "1 egg"] }],
		parsedIngredients: [
			{ quantity: 2, unit: "cup", name: "flour", note: null, tags: [], raw: "2 cups flour", sourcePath: "Test Recipe.md", sourceLabel: "Test Recipe" },
			{ quantity: 1, unit: "", name: "egg", note: null, tags: [], raw: "1 egg", sourcePath: "Test Recipe.md", sourceLabel: "Test Recipe" },
		],
		instructionGroups: [{ heading: null, headingLevel: 3, steps: ["Mix.", "Bake."] }],
		nutrition: {},
		image: null,
		introContent: "",
		trailingSections: [],
		sourcePath: "Test Recipe.md",
		...overrides,
	};
}

export const DEFAULT_EXPORT_OPTIONS: RecipeExportOptions = {
	includeCookHistoryAndSections: false,
	includeImages: false,
	applyCurrentMultiplier: false,
};
