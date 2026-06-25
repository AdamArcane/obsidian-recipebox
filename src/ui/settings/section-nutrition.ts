/**
 * Settings section for nutrition display options — property names for calories,
 * protein, fat, and carbs, plus per-serving vs. total display mode.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings, NutritionDisplay, NutritionSource } from "../../settings/settings-types";

export function renderSectionNutrition(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void
): void {
	new Setting(container).setName("Nutrition").setHeading();

	new Setting(container)
		.setName("Display mode")
		.setDesc("Whether to show nutrition totals per serving or for the whole recipe.")
		.addDropdown((dd) =>
			dd.addOptions({ "per-serving": "Per serving", total: "Total" } satisfies Record<NutritionDisplay, string>)
				.setValue(settings.nutritionDisplay)
				.onChange(async (v) => { settings.nutritionDisplay = v as NutritionDisplay; await save(); })
		);

	new Setting(container)
		.setName("Value source")
		.setDesc("How nutrition values are stored in frontmatter: as per-serving amounts or a recipe total.")
		.addDropdown((dd) =>
			dd.addOptions({ "per-serving": "Per serving", "recipe-total": "Recipe total" } satisfies Record<NutritionSource, string>)
				.setValue(settings.nutritionSource)
				.onChange(async (v) => { settings.nutritionSource = v as NutritionSource; await save(); })
		);

	const fields: Array<[string, keyof RecipeBoxSettings]> = [
		["Calories property", "caloriesProperty"],
		["Protein property", "proteinProperty"],
		["Fat property", "fatProperty"],
		["Carbs property", "carbsProperty"],
	];
	for (const [label, key] of fields) {
		new Setting(container)
			.setName(label)
			.addText((t) =>
				t.setValue(settings[key] as string).onChange(async (v) => {
					(settings as unknown as Record<string, string>)[key] = v;
					await save();
				})
			);
	}
}
