/**
 * Writes edited nutrition values back to frontmatter. Always targets the
 * configured property name (never an alias), always flattens the legacy
 * nested `nutrition: {}` block, and always deletes the alias/nested keys a
 * value used to live under -- see nutrition-edit-spec.md for why cleanup
 * beats leaving orphaned duplicate keys behind.
 *
 * The mutation itself (applyNutritionEdits) is split out from the
 * processFrontMatter call so it can be unit tested against a plain object,
 * without mocking Obsidian's App/TFile.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { NUTRITION_FIELDS } from "./nutrition-fields";

/** Keyed by settingsKey (e.g. "caloriesProperty"), same key the modal uses for its draft. */
export type NutritionEditValues = Record<string, string>;

export function applyNutritionEdits(
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	values: NutritionEditValues,
): void {
	const nested = fm["nutrition"];
	const nestedObj =
		nested && typeof nested === "object" && !Array.isArray(nested)
			? (nested as Record<string, unknown>)
			: null;

	for (const field of NUTRITION_FIELDS) {
		const configuredKey = settings[field.settingsKey] as string;
		const staleKeys = [configuredKey, ...field.aliases].filter((k) => k !== configuredKey);

		for (const alias of staleKeys) {
			delete fm[alias];
			if (nestedObj) delete nestedObj[alias];
		}
		if (nestedObj) delete nestedObj[configuredKey];

		const raw = values[field.settingsKey] ?? "";
		const trimmed = raw.trim();
		if (trimmed === "") {
			delete fm[configuredKey];
			continue;
		}
		const num = parseFloat(trimmed);
		if (isFinite(num)) fm[configuredKey] = num;
	}

	if (nestedObj && Object.keys(nestedObj).length === 0) {
		delete fm["nutrition"];
	}
}

export async function saveNutritionEdits(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	values: NutritionEditValues,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		applyNutritionEdits(fm as Record<string, unknown>, settings, values);
	});
}
