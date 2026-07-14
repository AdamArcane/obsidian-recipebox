/**
 * Builds the schema.org/Recipe JSON-LD embedded in a shared recipe page.
 * Deliberately a separate builder from the general export's
 * exportRecipeJsonLd(), not a thin wrapper around it: that function also
 * emits suitableForDiet and keywords (from allergens), which are fine for
 * the user's own local export but are not on the share feature's allowlist
 * (see build-share-html.ts) -- dietary tags and allergens can reveal health
 * information the recipient was never meant to see. Operating on
 * ShareableRecipeData rather than the full RecipeExportData means there's no
 * diet/allergens field here to accidentally wire up later.
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { stripObsidianMarkdown } from "../recipe-export/obsidian-markdown-strip";
import { resolveRawNutrition } from "../recipe-export/nutrition-raw";
import { HowToStep, HowToSection, NutritionInformation, toIsoDuration, ingredientText, recipeAuthor } from "../recipe-export/exporters/json-ld-exporter";
import { ShareableRecipeData } from "./share-export-data";



export interface ShareRecipeJsonLd {
	"@context": "https://schema.org";
	"@type": "Recipe";
	name: string;
	author: recipeAuthor;
	image?: string;
	recipeYield?: string;
	prepTime?: string;
	cookTime?: string;
	totalTime?: string;
	description?: string;
	recipeIngredient: string[];
	recipeInstructions: Array<HowToStep | HowToSection>;
	nutrition?: NutritionInformation;
}

export function buildShareRecipeJsonLd(
	data: ShareableRecipeData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): ShareRecipeJsonLd {
	const recipe: ShareRecipeJsonLd = {
		"@context": "https://schema.org",
		"@type": "Recipe",
		name: data.title,
		// Required by some JSON-LD consumers (e.g. recipe-scrapers' wild-mode
		// extractor validates a Recipe schema that expects "author" to be
		// present). Deliberately generic, not the sharer's name -- there are
		// no accounts in this system, and no other part of the share feature
		// exposes who shared a recipe. Don't change this to a real identity
		// without a real privacy review, same as the rest of the allowlist.
		author: { "@type": "Organization", name: "Recipe Box" },
		recipeIngredient: [],
		recipeInstructions: [],
	};

	if (data.image?.kind === "url") recipe.image = data.image.url;
	if (data.servings !== null) recipe.recipeYield = String(data.servings);

	const prepTime = toIsoDuration(data.times.prep);
	const cookTime = toIsoDuration(data.times.cook);
	const totalTime = toIsoDuration(data.times.total);
	if (prepTime) recipe.prepTime = prepTime;
	if (cookTime) recipe.cookTime = cookTime;
	if (totalTime) recipe.totalTime = totalTime;

	const intro = stripObsidianMarkdown(data.introContent).trim();
	if (intro) recipe.description = intro;

	recipe.recipeIngredient = data.parsedIngredients.map(ingredientText);

	recipe.recipeInstructions = data.instructionGroups.flatMap((group): Array<HowToStep | HowToSection> => {
		const steps: HowToStep[] = group.steps.map((step) => ({
			"@type": "HowToStep",
			text: stripObsidianMarkdown(step),
		}));
		return group.heading
			? [{ "@type": "HowToSection", name: group.heading, itemListElement: steps }]
			: steps;
	});

	// Nutrition is allowlisted (see build-share-html.ts), so reading it off
	// frontmatter here -- through the same settings-configured calorie/
	// protein/fat/carb keys the general exporter uses -- is fine; nothing
	// else is read from frontmatter in this builder.
	const nutrition = resolveRawNutrition(frontmatter, settings, 1);
	if (nutrition.calories !== null || nutrition.protein !== null || nutrition.fat !== null || nutrition.carbs !== null) {
		recipe.nutrition = {
			"@type": "NutritionInformation",
			...(nutrition.calories !== null ? { calories: `${nutrition.calories} calories` } : {}),
			...(nutrition.protein !== null ? { proteinContent: `${nutrition.protein}g` } : {}),
			...(nutrition.fat !== null ? { fatContent: `${nutrition.fat}g` } : {}),
			...(nutrition.carbs !== null ? { carbohydrateContent: `${nutrition.carbs}g` } : {}),
		};
	}

	return recipe;
}

export function stringifyShareRecipeJsonLd(
	data: ShareableRecipeData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): string {
	return JSON.stringify(buildShareRecipeJsonLd(data, frontmatter, settings), null, 2);
}
