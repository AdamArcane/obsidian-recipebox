/**
 * Settings section for meal plan configuration — note path, auto-add on sync,
 * tag filter, and meal type notation format.
 */
import { App, Setting } from "obsidian";
import { MealTypeNotation, RecipeBoxSettings } from "../../settings/settings-types";
import { NotePathSuggest } from "../components/note-path-suggest";


export function renderSectionMealPlan(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Meal plan").setHeading();

	new Setting(container)
		.setName("Meal plan note path")
		.setDesc("Path to the note used as your meal plan. Created automatically if it doesn't exist.")
		.addText((t) => {
			t.setValue(settings.mealPlanPath).onChange(async (v) => {
				settings.mealPlanPath = v;
				await save();
			});
			new NotePathSuggest(app, t.inputEl);
		});

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
		.setDesc("Automatically add ingredients to the grocery list when syncing newly added meal plan entries.")
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
		.setDesc("Only auto-add recipes carrying this tag. Leave empty to include all recipes.")
		.addText((t) =>
			t.setValue(settings.autoAddTagFilter).onChange(async (v) => {
				settings.autoAddTagFilter = v;
				await save();
			})
		);
}
