/**
 * Renders RecipeExportData as schema.org/Recipe JSON-LD, for indexability
 * and rich snippets. Not meant to round-trip.
 *
 * Deliberately not sharing the includeCookHistoryAndSections toggle's effects
 * with other formats: schema.org's Recipe type has no field for personal
 * cook history, so there's nowhere for lastMade/trailingSections to go here
 * regardless of the toggle.
 *
 * Allergens and diet have no clean 1:1 schema.org mapping (see module
 * comments below on each) -- these are the real decisions the export spec
 * deferred until this exporter actually got built.
 */
import { RecipeExportData } from "../recipe-export-data";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { stripObsidianMarkdown } from "../obsidian-markdown-strip";
import { resolveRawNutrition } from "../nutrition-raw";
import { formatQuantity } from "../../parser/quantity-format";

export interface HowToStep {
	"@type": "HowToStep";
	text: string;
}

export interface HowToSection {
	"@type": "HowToSection";
	name: string;
	itemListElement: HowToStep[];
}

export interface NutritionInformation {
	"@type": "NutritionInformation";
	calories?: string;
	proteinContent?: string;
	fatContent?: string;
	carbohydrateContent?: string;
}

export interface RecipeJsonLd {
	"@context": "https://schema.org";
	"@type": "Recipe";
	name: string;
	image?: string;
	recipeYield?: string;
	prepTime?: string;
	cookTime?: string;
	totalTime?: string;
	description?: string;
	suitableForDiet?: string[];
	keywords?: string;
	recipeIngredient: string[];
	recipeInstructions: Array<HowToStep | HowToSection>;
	nutrition?: NutritionInformation;
}

// schema.org/RestrictedDiet only defines a fixed enum -- anything that doesn't
// match one of these gets passed through as plain text per the spec's
// "dropped or passed through as plain text otherwise" guidance.
const DIET_ENUM_MAP: Record<string, string> = {
	vegan: "VeganDiet",
	vegetarian: "VegetarianDiet",
	"gluten-free": "GlutenFreeDiet",
	"gluten free": "GlutenFreeDiet",
	glutenfree: "GlutenFreeDiet",
	kosher: "KosherDiet",
	halal: "HalalDiet",
	diabetic: "DiabeticDiet",
	"low calorie": "LowCalorieDiet",
	"low-calorie": "LowCalorieDiet",
	"low fat": "LowFatDiet",
	"low-fat": "LowFatDiet",
	"low lactose": "LowLactoseDiet",
	"low-lactose": "LowLactoseDiet",
	"low salt": "LowSaltDiet",
	"low-salt": "LowSaltDiet",
};

function mapDietToSchemaOrg(diet: string[]): string[] {
	return diet.map((d) => {
		const mapped = DIET_ENUM_MAP[d.trim().toLowerCase()];
		return mapped ? `https://schema.org/${mapped}` : d;
	});
}

export function toIsoDuration(minutes: number | null): string | undefined {
	if (minutes === null || minutes <= 0) return undefined;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}`;
}

export function ingredientText(ing: RecipeExportData["parsedIngredients"][number]): string {
	const qty = formatQuantity(ing.quantity);
	const parts = [qty, ing.unit, stripObsidianMarkdown(ing.name)].filter(Boolean);
	const note = ing.note ? ` (${stripObsidianMarkdown(ing.note)})` : "";
	return parts.join(" ") + note;
}

export function exportRecipeJsonLd(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): RecipeJsonLd {
	const recipe: RecipeJsonLd = {
		"@context": "https://schema.org",
		"@type": "Recipe",
		name: data.title,
		recipeIngredient: [],
		recipeInstructions: [],
	};

	// A vault-relative resource path isn't a fetchable URL, so it's omitted
	// entirely rather than emitted as a broken image link -- rich snippets
	// expect a real fetchable URL, not a data URI or local reference.
	if (data.image?.kind === "url") recipe.image = data.image.url;

	if (data.servings !== null) recipe.recipeYield = String(data.servings);

	const prepTime = toIsoDuration(data.meta.times.prep);
	const cookTime = toIsoDuration(data.meta.times.cook);
	const totalTime = toIsoDuration(data.meta.times.total);
	if (prepTime) recipe.prepTime = prepTime;
	if (cookTime) recipe.cookTime = cookTime;
	if (totalTime) recipe.totalTime = totalTime;

	const intro = stripObsidianMarkdown(data.introContent).trim();
	if (intro) recipe.description = intro;

	if (data.meta.diet.length > 0) recipe.suitableForDiet = mapDietToSchemaOrg(data.meta.diet);

	// No clean schema.org slot for allergens (see spec) -- folded into keywords
	// as plain search terms rather than omitted entirely or stuffed into description.
	if (data.meta.allergens.length > 0) recipe.keywords = data.meta.allergens.join(", ");

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

	const nutrition = resolveRawNutrition(frontmatter, settings, data.multiplier);
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

export function stringifyRecipeJsonLd(data: RecipeExportData, frontmatter: Record<string, unknown>, settings: RecipeBoxSettings): string {
	return JSON.stringify(exportRecipeJsonLd(data, frontmatter, settings), null, 2);
}
