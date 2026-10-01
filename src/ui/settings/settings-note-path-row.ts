/**
 * Render callbacks for the meal plan and grocery list path rows. These stay
 * text inputs (not the file picker) because values are {token} patterns that
 * often name notes that do not exist yet; they get autocomplete and a
 * resolved-path preview instead.
 */
import { App, Setting } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { NotePathSuggest } from "../components/note-path-suggest";
import { renderNotePathPreview } from "../components/note-path-preview";

export function renderNotePathRow(
	app: App,
	plugin: RecipeBoxPlugin,
	key: "mealPlanPath" | "groceryListPath",
	setting: Setting,
): void {
	const preview = renderNotePathPreview(setting.descEl, plugin.settings[key]);

	setting.addText((t) => {
		t.setValue(plugin.settings[key]).onChange((v) => {
			plugin.settings[key] = v;
			preview.update(v);
			// Hand-saved because render rows have no control key; saveSettings also
			// refreshes views, the gallery, and ribbon icons.
			void plugin.saveSettings();
		});
		new NotePathSuggest(app, t.inputEl);
	});
}
