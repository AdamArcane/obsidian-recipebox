/**
 * Settings section for nutrition display options — per-serving vs. total
 * display mode and value source. Property names live in the consolidated
 * "Property names" section.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings, NutritionDisplay, NutritionSource } from "../../settings/settings-types";

export function renderSectionNutrition(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void
): void {
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
}
