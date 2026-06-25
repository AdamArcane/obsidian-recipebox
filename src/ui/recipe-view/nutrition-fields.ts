/**
 * Defines the four standard nutrition fields (calories, protein, fat, carbs)
 * and resolves their display values with per-serving or total scaling.
 */
import { RecipeBoxSettings } from "../../settings/settings-types";
import { fmNutrient } from "./frontmatter-read-helpers";

export interface NutritionFieldDef {
	label: string;
	unit: string;
	settingsKey: keyof RecipeBoxSettings;
	aliases: string[];
}

export const NUTRITION_FIELDS: NutritionFieldDef[] = [
	{ label: "Calories", unit: "", settingsKey: "caloriesProperty", aliases: ["calories", "kcal", "cal"] },
	{ label: "Protein", unit: "g", settingsKey: "proteinProperty", aliases: ["protein"] },
	{ label: "Fat", unit: "g", settingsKey: "fatProperty", aliases: ["fat", "total fat"] },
	{ label: "Carbs", unit: "g", settingsKey: "carbsProperty", aliases: ["carbs", "carbohydrates", "carbohydrate"] },
];

function formatNutritionNumber(n: number): string {
	if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
	return n.toFixed(1);
}

export function resolveNutritionDisplay(
	fm: Record<string, unknown>,
	field: NutritionFieldDef,
	settings: RecipeBoxSettings,
	servings: number | null,
	multiplier: number,
): string {
	const configuredKey = settings[field.settingsKey] as string;
	const lookupKeys = [configuredKey, ...field.aliases.filter(a => a !== configuredKey)];
	const raw = fmNutrient(fm, lookupKeys);
	if (raw === null) return "—";

	const source = settings.nutritionSource;
	const display = settings.nutritionDisplay;

	let value = raw * multiplier;

	if (source !== display) {
		if (!servings || servings <= 0) {
			// Can't convert without servings — show raw scaled value
		} else if (source === "per-serving" && display === "total") {
			value *= servings;
		} else if (source === "recipe-total" && display === "per-serving") {
			value /= servings;
		}
	}

	return formatNutritionNumber(value) + (field.unit ? " " + field.unit : "");
}
