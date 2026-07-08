/**
 * Settings section for meal plan configuration — meal type notation format,
 * auto-add on sync, and tag filter. The note path lives in the Notes section.
 */
import { Setting } from "obsidian";
import { MealTypeNotation, RecipeBoxSettings } from "../../settings/settings-types";

export function renderSectionMealPlan(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void
): void {
	new Setting(container).setName("Meal plan").setHeading();

	let fieldNameSetting: Setting | null = null;

	new Setting(container)
		.setName("Meal type notation")
		.setDesc("How meal types are written in your meal plan note.")
		.addDropdown((d) => {
			d.addOption("tag", "Obsidian tag  (#meal/dinner)");
			d.addOption("dataview", "Dataview field  ([meal:: Dinner])");
			d.addOption("text", "Plain text  ((dinner))");
			d.setValue(settings.mealTypeNotation);
			d.onChange(async (v) => {
				settings.mealTypeNotation = v as MealTypeNotation;
				await save();
				fieldNameSetting?.settingEl.toggle(v !== "text");
			});
		});

	fieldNameSetting = new Setting(container)
		.setName("Meal type field/tag name")
		.setDesc('The tag or field name used in the note. Changing this won\'t rename existing entries until they\'re next updated.')
		.addText((t) =>
			t.setValue(settings.mealTypeFieldName).onChange(async (v) => {
				settings.mealTypeFieldName = v.trim() || "meal";
				await save();
			})
		);
	fieldNameSetting.settingEl.toggle(settings.mealTypeNotation !== "text");

	new Setting(container)
		.setName("Auto-add ingredients on sync")
		.setDesc("Automatically add ingredients to the grocery list when manually added entries are added to the meal plan.")
		.addToggle((t) =>
			t.setValue(settings.autoAddOnSync).onChange(async (v) => {
				settings.autoAddOnSync = v;
				await save();
				rerender();
			})
		);

	if (!settings.autoAddOnSync) return;

	new Setting(container)
		.setName("Required tag filter")
		.setDesc("Only auto-add ingredients from recipes carrying this tag. Leave empty to include all recipes.")
		.addText((t) =>
			t.setValue(settings.autoAddTagFilter).onChange(async (v) => {
				settings.autoAddTagFilter = v;
				await save();
			})
		);
}
