/**
 * Settings section for the recipe importer — default save folder and optional
 * custom Markdown template path.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { NotePathSuggest } from "../components/note-path-suggest";
import { FolderSuggest } from "../components/folder-suggest";

export function renderSectionImporter(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void,
	app: App
): void {
	new Setting(container)
		.setName("Recipe template note path")
		.setDesc("Path to a note used as a template when importing. Leave empty to use the built-in default.")
		.addText((t) => {
			t.setValue(settings.importerTemplatePath).onChange(async (v) => {
				settings.importerTemplatePath = v.trim();
				await save();
			});
			new NotePathSuggest(app, t.inputEl);
		});

	new Setting(container)
		.setName("Default import folder")
		.setDesc("Where imported recipes are saved. Leave empty to use the first configured recipe folder.")
		.addText((t) => {
			t.setValue(settings.importerDefaultFolder).onChange(async (v) => {
				settings.importerDefaultFolder = v.trim();
				await save();
			});
			new FolderSuggest(app, t.inputEl);
		});
}
