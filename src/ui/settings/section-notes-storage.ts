/**
 * Settings section for note storage — meal plan note path, grocery list note
 * path, and the ingredients/instructions heading names.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { NotePathSuggest } from "../components/note-path-suggest";
import { renderNotePathPreview } from "../components/note-path-preview";

export function renderSectionNotesStorage(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Notes").setHeading();

	const mealPlanPathSetting = new Setting(container)
		.setName("Meal plan note path")
		.setDesc("Path to the note used as your meal plan. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Meal Plans/{YYYY}/Week {ww}.md\".");

	const mealPlanPathPreview = renderNotePathPreview(mealPlanPathSetting.descEl, settings.mealPlanPath);

	mealPlanPathSetting.addText((t) => {
		t.setValue(settings.mealPlanPath).onChange(async (v) => {
			settings.mealPlanPath = v;
			mealPlanPathPreview.update(v);
			await save();
		});
		new NotePathSuggest(app, t.inputEl);
	});

	const groceryListPathSetting = new Setting(container)
		.setName("Grocery list note path")
		.setDesc("Path to the note used as your grocery list. Created automatically if it doesn't exist. Supports {token} date patterns, e.g. \"Groceries/{YYYY}/Week {ww}.md\".");

	const groceryListPathPreview = renderNotePathPreview(groceryListPathSetting.descEl, settings.groceryListPath);

	groceryListPathSetting.addText((t) => {
		t.setValue(settings.groceryListPath).onChange(async (v) => {
			settings.groceryListPath = v;
			groceryListPathPreview.update(v);
			await save();
		});
		new NotePathSuggest(app, t.inputEl);
	});

	new Setting(container)
		.setName("Ingredients heading")
		.setDesc("The heading that marks the ingredients section in a recipe note.")
		.addText((t) =>
			t.setValue(settings.ingredientsHeading).onChange(async (v) => {
				settings.ingredientsHeading = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Instructions heading")
		.setDesc("The heading that marks the instructions section in a recipe note.")
		.addText((t) =>
			t.setValue(settings.instructionsHeading).onChange(async (v) => {
				settings.instructionsHeading = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Notes heading")
		.setDesc("The heading that marks the (optional) notes section in a recipe note.")
		.addText((t) =>
			t.setValue(settings.notesHeading).onChange(async (v) => {
				settings.notesHeading = v;
				await save();
			})
		);
}
