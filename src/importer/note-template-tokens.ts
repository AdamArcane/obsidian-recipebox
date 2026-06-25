/**
 * Builds the flat token table (string → string) consumed by note-template-render.ts,
 * including nutrition scaling when the source is a per-serving total.
 */
import { ExtractedRecipe } from "./recipe-extract-types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { localDateISO } from "../utils/date";

export function parseServingCount(yieldString: string): number | null {
	const m = yieldString.match(/\d+/);
	if (!m) return null;
	const n = parseInt(m[0], 10);
	return isFinite(n) && n > 0 ? n : null;
}

function numStr(n: number | null): string {
	return n !== null ? String(n) : "";
}

function scaledNutrition(
	recipe: ExtractedRecipe,
	settings: RecipeBoxSettings,
): { calories: string; protein: string; fat: string; carbs: string } {
	if (settings.nutritionSource !== "recipe-total" || !recipe.servings) {
		return {
			calories: numStr(recipe.calories),
			protein: numStr(recipe.protein),
			fat: numStr(recipe.fat),
			carbs: numStr(recipe.carbs),
		};
	}
	const count = parseServingCount(recipe.servings);
	if (!count) {
		return {
			calories: numStr(recipe.calories),
			protein: numStr(recipe.protein),
			fat: numStr(recipe.fat),
			carbs: numStr(recipe.carbs),
		};
	}
	const scale = (n: number | null) => (n !== null ? numStr(Math.round(n * count)) : "");
	return {
		calories: scale(recipe.calories),
		protein: scale(recipe.protein),
		fat: scale(recipe.fat),
		carbs: scale(recipe.carbs),
	};
}

export function buildTokenTable(
	recipe: ExtractedRecipe,
	settings: RecipeBoxSettings,
): Record<string, string> {
	const nutrition = scaledNutrition(recipe, settings);
	return {
		title: recipe.title,
		description: recipe.description,
		image: recipe.heroImage ?? "",
		sourceUrl: recipe.sourceUrl,
		servings: recipe.servings ?? "",
		prepTime: numStr(recipe.prepTime),
		cookTime: numStr(recipe.cookTime),
		totalTime: numStr(recipe.totalTime),
		calories: nutrition.calories,
		protein: nutrition.protein,
		fat: nutrition.fat,
		carbs: nutrition.carbs,
		today: localDateISO(),
		// Config-name tokens
		ingredientsHeading: settings.ingredientsHeading,
		instructionsHeading: settings.instructionsHeading,
		caloriesProperty: settings.caloriesProperty,
		proteinProperty: settings.proteinProperty,
		fatProperty: settings.fatProperty,
		carbsProperty: settings.carbsProperty,
		allergensProperty: settings.allergensProperty,
		lastMadeProperty: settings.lastMadeProperty,
		recipeTypePropertyName: settings.recipeTypePropertyName,
		recipeType: settings.recipeType,
	};
}
