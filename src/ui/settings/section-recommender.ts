/**
 * Settings section for the meal recommender — day window and suggestion count
 * used when generating recipe recommendations.
 */
import { Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionRecommender(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void
): void {
	new Setting(container).setName("Meal recommender").setHeading();

	new Setting(container)
		.setName("Exclusion window (days)")
		.setDesc("Recipes cooked within this many days will be excluded from suggestions.")
		.addText((t) => {
			t.inputEl.type = "number";
			t.setValue(String(settings.suggestionDayWindow)).onChange(async (v) => {
				const n = parseInt(v, 10);
				if (n >= 1) {
					settings.suggestionDayWindow = n;
					await save();
				}
			});
		});

	new Setting(container)
		.setName("Number of suggestions")
		.addText((t) => {
			t.inputEl.type = "number";
			t.setValue(String(settings.suggestionCount)).onChange(async (v) => {
				const n = parseInt(v, 10);
				if (n >= 1) {
					settings.suggestionCount = n;
					await save();
				}
			});
		});
}
