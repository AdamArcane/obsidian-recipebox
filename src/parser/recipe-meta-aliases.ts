import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";

export const ALIASES: Record<string, string[]> = {
	diet: [RECIPE_FRONTMATTER.diet, "diets", "dietary"],
	allergens: [RECIPE_FRONTMATTER.allergens, "allergen", "allergies"],
	prepTime: [RECIPE_FRONTMATTER.prepTime, "prepTime", "prep_time", "preparation_time", "prep"],
	cookTime: [RECIPE_FRONTMATTER.cookTime, "cookTime", "cook_time", "cooking_time", "cook"],
	totalTime: [RECIPE_FRONTMATTER.totalTime, "totalTime", "total_time", "time"],
	favorite: [RECIPE_FRONTMATTER.favorite, "favourite", "starred"],
	cookedCount: [RECIPE_FRONTMATTER.cookedCount, "cooked_count", "timesCooked", "times_cooked"],
};
