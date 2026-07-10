/**
 * Renders RecipeExportData as the "Recipe Box interchange format": standard
 * markdown syntactically (YAML frontmatter + plain text), but the field
 * semantics (prepTime in minutes, canonical heading names) are a convention
 * this plugin invented -- it round-trips cleanly through a fresh Recipe Box
 * install, not through Mealie/Paprika/other tools that happen to read YAML.
 *
 * Canonical keys/headings are used deliberately instead of the exporting
 * user's configured property names or heading text, since a fresh install's
 * default aliases are what a re-import actually matches against first.
 */
import { stringifyYaml } from "obsidian";
import { RecipeExportData, RecipeExportOptions } from "../recipe-export-data";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";
import { stripObsidianMarkdown } from "../obsidian-markdown-strip";
import { resolveRawNutrition } from "../nutrition-raw";

// Canonical body headings for the interchange format -- intentionally not
// settings.ingredientsHeading/instructionsHeading, since a fresh install's
// defaults (which happen to equal these) are what re-import will look for.
const CANONICAL_INGREDIENTS_HEADING = "Ingredients";
const CANONICAL_INSTRUCTIONS_HEADING = "Instructions";

export function exportImportableMarkdown(
	data: RecipeExportData,
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	options: RecipeExportOptions,
): string {
	const yaml: Record<string, unknown> = {
		[RECIPE_FRONTMATTER.type]: DEFAULT_SETTINGS.recipeType,
	};

	if (data.image?.kind === "url") yaml[RECIPE_FRONTMATTER.image] = data.image.url;
	if (data.servings !== null) yaml[RECIPE_FRONTMATTER.servings] = data.servings;
	if (data.meta.times.prep !== null) yaml[RECIPE_FRONTMATTER.prepTime] = data.meta.times.prep;
	if (data.meta.times.cook !== null) yaml[RECIPE_FRONTMATTER.cookTime] = data.meta.times.cook;
	if (data.meta.times.total !== null) yaml[RECIPE_FRONTMATTER.totalTime] = data.meta.times.total;
	if (data.meta.diet.length > 0) yaml[RECIPE_FRONTMATTER.diet] = data.meta.diet;
	if (data.meta.allergens.length > 0) yaml[RECIPE_FRONTMATTER.allergens] = data.meta.allergens;

	const nutrition = resolveRawNutrition(frontmatter, settings, data.multiplier);
	if (nutrition.calories !== null) yaml[RECIPE_FRONTMATTER.calories] = nutrition.calories;
	if (nutrition.protein !== null) yaml[RECIPE_FRONTMATTER.protein] = nutrition.protein;
	if (nutrition.fat !== null) yaml[RECIPE_FRONTMATTER.fat] = nutrition.fat;
	if (nutrition.carbs !== null) yaml[RECIPE_FRONTMATTER.carbs] = nutrition.carbs;

	const lines: string[] = ["---", stringifyYaml(yaml).trimEnd(), "---", "", `# ${data.title}`, ""];

	if (data.image?.kind === "vault" && options.includeImages) {
		lines.push("*(image omitted -- image bundling not yet supported)*", "");
	}

	const intro = stripObsidianMarkdown(data.introContent).trim();
	if (intro) lines.push(intro, "");

	lines.push(`## ${CANONICAL_INGREDIENTS_HEADING}`, "");
	for (const group of data.ingredientGroups) {
		if (group.lines.length === 0) continue;
		if (group.heading) lines.push(`### ${group.heading}`, "");
		for (const line of group.lines) lines.push(stripObsidianMarkdown(line));
		lines.push("");
	}

	lines.push(`## ${CANONICAL_INSTRUCTIONS_HEADING}`, "");
	for (const group of data.instructionGroups) {
		if (group.heading) lines.push(`${"#".repeat(Math.max(group.headingLevel, 3))} ${group.heading}`, "");
		group.steps.forEach((step, i) => lines.push(`${i + 1}. ${stripObsidianMarkdown(step)}`));
		lines.push("");
	}

	// trailingSections is already gated by options.includeCookHistoryAndSections
	// upstream in buildRecipeExportData -- empty here means the toggle was off.
	for (const section of data.trailingSections) {
		const body = stripObsidianMarkdown(section.body).trim();
		if (!body) continue;
		lines.push(`## ${section.heading}`, "", body, "");
	}

	return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
