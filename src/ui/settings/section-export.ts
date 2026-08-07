/**
 * Settings section for export: one shared destination folder plus per-format
 * defaults, so recipe, grocery, and future export features (meal plan, etc.)
 * configure "where things go" once instead of each accumulating its own
 * folder setting that drifts out of sync.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings, RecipeExportFormat } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";

const RECIPE_EXPORT_FORMAT_LABELS: Record<RecipeExportFormat, string> = {
	"plain-markdown": "Markdown (plain)",
	"importable-markdown": "Markdown (importable)",
	json: "JSON",
	"json-ld": "JSON-LD",
};

export function renderSectionExport(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
): void {
	renderBody(container, settings, save, rerender, app);
}

function renderBody(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	new Setting(container)
		.setDesc("Shared folder and per-format defaults for recipe and grocery exports. Future export features (meal plan, etc.) will also use these settings instead of accumulating their own scattered folder settings.");

	new Setting(container)
		.setName("Default export folder")
		.setDesc("Shared destination for exports that save into the vault (recipe and grocery list). Leave blank for the vault root.")
		.addText((t) => {
			t.setValue(settings.exportFolder).onChange(async (v) => {
				settings.exportFolder = v;
				await save();
			});
			new FolderSuggest(app, t.inputEl);
		});


	new Setting(container).setName("Recipe export").setHeading();

	new Setting(container)
		.setName("Default format")
		.addDropdown((dd) =>
			dd
				.addOptions(RECIPE_EXPORT_FORMAT_LABELS)
				.setValue(settings.recipeExportDefaultFormat)
				.onChange(async (v) => {
					settings.recipeExportDefaultFormat = v as RecipeExportFormat;
					await save();
				})
		);

	new Setting(container)
		.setName("Include cook history and sections by default")
		.addToggle((t) =>
			t.setValue(settings.recipeExportIncludeCookHistoryDefault).onChange(async (v) => {
				settings.recipeExportIncludeCookHistoryDefault = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Include images by default")
		.setDesc("Image bundling isn't implemented yet, so exports currently omit local images regardless of this setting.")
		.addToggle((t) =>
			t.setValue(settings.recipeExportIncludeImagesDefault).onChange(async (v) => {
				settings.recipeExportIncludeImagesDefault = v;
				await save();
			})
		);

	new Setting(container).setName("Grocery list export").setHeading();


}
