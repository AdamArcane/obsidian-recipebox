/**
 * Narrows a full RecipeExportData snapshot down to the allowlisted fields a
 * public share link is allowed to publish: title, ingredients, instructions,
 * prep/cook/total time, servings, nutrition, and header image. Everything
 * else on RecipeExportData/RecipeMeta (diet, allergens, favorite,
 * cookedCount, lastMade, ...) is dropped here rather than trusted to stay
 * unused downstream -- an allowlist fails safe if a new field is added to
 * RecipeExportData later, whereas code that just "doesn't happen to read"
 * the sensitive fields would silently start leaking them the moment some
 * other renderer reused the full object.
 */
import { RecipeExportData, RecipeExportImage } from "../recipe-export/recipe-export-data";
import { stripObsidianMarkdown } from "../recipe-export/obsidian-markdown-strip";
import { RecipeTimes } from "../parser/recipe-meta-read";
import { IngredientGroup, InstructionGroup, RecipeIngredient } from "../types";

export interface ShareableRecipeData {
	title: string;
	servings: number | null;
	times: RecipeTimes;
	ingredientGroups: IngredientGroup[];
	parsedIngredients: RecipeIngredient[];
	instructionGroups: InstructionGroup[];
	nutrition: Record<string, string>;
	image: RecipeExportImage;
	introContent: string;
}

export function toShareableRecipeData(data: RecipeExportData): ShareableRecipeData {
	return {
		title: data.title,
		servings: data.servings,
		times: data.meta.times,
		ingredientGroups: data.ingredientGroups,
		parsedIngredients: data.parsedIngredients,
		instructionGroups: data.instructionGroups,
		nutrition: data.nutrition,
		image: data.image,
		introContent: stripObsidianMarkdown(data.introContent),
	};
}
