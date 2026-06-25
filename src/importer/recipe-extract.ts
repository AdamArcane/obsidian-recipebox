/**
 * Extracts structured recipe data from raw HTML using the recipe-scrapers library
 * and maps it to the plugin's ExtractedRecipe shape.
 */
import { scrapeRecipe } from "recipe-scrapers";
import { ExtractedRecipe, ImportedGroup } from "./recipe-extract-types";
import { parseNutrient } from "./nutrient-parse";

function nutrientValue(nutrients: Record<string, string>, ...keys: string[]): number | null {
	for (const key of keys) {
		const raw = nutrients[key];
		if (raw) {
			const n = parseNutrient(raw);
			if (n !== null) return n;
		}
	}
	return null;
}

function toImportedGroups(
	groups: { name: string | null; items: { value: string }[] }[],
): ImportedGroup[] {
	return groups.map(g => ({ name: g.name ?? null, items: g.items.map(i => i.value) }));
}

export async function extractRecipe(html: string, url: string): Promise<ExtractedRecipe | null> {
	try {
		const data = await scrapeRecipe(html, url);
		if (!data?.title) return null;

		const nutrients: Record<string, string> = data.nutrients ?? {};

		return {
			title: data.title,
			description: data.description ?? "",
			heroImage: data.image || null,
			servings: data.yields || null,
			prepTime: data.prepTime ?? null,
			cookTime: data.cookTime ?? null,
			totalTime: data.totalTime ?? null,
			ingredientGroups: toImportedGroups(data.ingredients ?? []),
			instructionGroups: toImportedGroups(data.instructions ?? []),
			sourceUrl: url,
			calories: nutrientValue(nutrients, "calories", "calorieContent"),
			protein: nutrientValue(nutrients, "proteinContent", "protein"),
			fat: nutrientValue(nutrients, "fatContent", "fat"),
			carbs: nutrientValue(nutrients, "carbohydrateContent", "carbs"),
		};
	} catch {
		return null;
	}
}
