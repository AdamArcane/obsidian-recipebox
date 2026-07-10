/**
 * Resolves nutrition as raw scaled numbers rather than resolveNutritionDisplay()'s
 * formatted display text -- Importable Markdown YAML, JSON, and JSON-LD all need
 * machine-readable values. Deliberately skips the per-serving/total display
 * conversion resolveNutritionDisplay() does: that conversion exists for showing
 * a number to a human on screen, but these formats should preserve whatever
 * basis (per-serving or total) the recipe was actually written in, since a
 * re-import or JSON consumer has no way to know which basis got applied.
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { NUTRITION_FIELDS, NutritionFieldDef } from "../ui/recipe-view/nutrition-fields";
import { fmNutrient } from "../ui/recipe-view/frontmatter-read-helpers";

export interface RawNutrition {
	calories: number | null;
	protein: number | null;
	fat: number | null;
	carbs: number | null;
}

const FIELD_KEY: Record<string, keyof RawNutrition> = {
	Calories: "calories",
	Protein: "protein",
	Fat: "fat",
	Carbs: "carbs",
};

function resolveRawValue(
	frontmatter: Record<string, unknown>,
	field: NutritionFieldDef,
	settings: RecipeBoxSettings,
	multiplier: number,
): number | null {
	const configuredKey = settings[field.settingsKey] as string;
	const lookupKeys = [configuredKey, ...field.aliases.filter((a) => a !== configuredKey)];
	const raw = fmNutrient(frontmatter, lookupKeys);
	return raw === null ? null : raw * multiplier;
}

export function resolveRawNutrition(
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
	multiplier: number,
): RawNutrition {
	const result: RawNutrition = { calories: null, protein: null, fat: null, carbs: null };
	for (const field of NUTRITION_FIELDS) {
		const key = FIELD_KEY[field.label];
		if (!key) continue;
		result[key] = resolveRawValue(frontmatter, field, settings, multiplier);
	}
	return result;
}
