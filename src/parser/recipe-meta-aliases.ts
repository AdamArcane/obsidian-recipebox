/**
 * Alias lists for well-known recipe frontmatter fields, enabling case-insensitive
 * lookup across common spelling variants (e.g. "prep", "prepTime", "prep_time").
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";

export interface RecipeMetaAliases {
	image: string[];
	diet: string[];
	allergens: string[];
	prepTime: string[];
	cookTime: string[];
	totalTime: string[];
	favorite: string[];
	cookedCount: string[];
	servings: string[];
}

function uniqueKeys(keys: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const key of keys) {
		const trimmed = key.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		out.push(trimmed);
	}
	return out;
}

/**
 * Returns frontmatter alias sets that always prioritize user-configured keys,
 * while preserving common fallbacks for older notes and imports.
 */
export function getRecipeMetaAliases(settings: RecipeBoxSettings): RecipeMetaAliases {
	return {
		image: uniqueKeys([settings.imageProperty, RECIPE_FRONTMATTER.image, "cover", "heroImage", "hero_image", "thumbnail", "thumb"]),
		diet: uniqueKeys([settings.dietProperty, RECIPE_FRONTMATTER.diet, "diets", "dietary"]),
		allergens: uniqueKeys([settings.allergensProperty, RECIPE_FRONTMATTER.allergens, "allergen", "allergies"]),
		prepTime: uniqueKeys([settings.prepTimeProperty, RECIPE_FRONTMATTER.prepTime, "prep_time", "preparation_time", "prep"]),
		cookTime: uniqueKeys([settings.cookTimeProperty, RECIPE_FRONTMATTER.cookTime, "cook_time", "cooking_time", "cook"]),
		totalTime: uniqueKeys([settings.totalTimeProperty, RECIPE_FRONTMATTER.totalTime, "total_time", "time"]),
		favorite: uniqueKeys([settings.favoriteProperty, RECIPE_FRONTMATTER.favorite, "favourite", "starred"]),
		cookedCount: uniqueKeys([settings.cookedCountProperty, RECIPE_FRONTMATTER.cookedCount, "cooked_count", "timesCooked", "times_cooked"]),
		servings: uniqueKeys([settings.servingsProperty, RECIPE_FRONTMATTER.servings, "serves", "serving", "yield", "portions"]),
	};
}
