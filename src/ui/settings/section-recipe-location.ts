/**
 * Settings section for recipe location — the folder(s) that contain recipe
 * notes and the heading names used to find ingredients and instructions.
 */
import { App, Setting, TFolder } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";
import { NotePathSuggest } from "../components/note-path-suggest";

export function renderSectionRecipeLocation(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Recipe location & structure").setHeading();

	// ── Recipe folders ──────────────────────────────────────────────────────
	const folderSetting = new Setting(container)
		.setName("Recipe folders")
		.setDesc("Scan only these folders for recipe notes. Leave empty to search the whole vault.");

	const folderList = folderSetting.settingEl.createDiv("recipe-box-folder-list");

	function renderFolderList(): void {
		folderList.empty();
		settings.recipeFolders.forEach((folder, i) => {
			const row = folderList.createDiv("recipe-box-list-row");
			row.createSpan({ text: folder });
			const del = row.createEl("button", { text: "✕" });
			del.addEventListener("click", () => {
				settings.recipeFolders.splice(i, 1);
				void save().then(() => renderFolderList());
			});
		});

		const addRow = folderList.createDiv("recipe-box-list-row");
		const input = addRow.createEl("input", { type: "text", placeholder: "Folder path" });
		new FolderSuggest(app, input);
		const addBtn = addRow.createEl("button", { text: "Add" });
		addBtn.addEventListener("click", () => {
			const val = input.value.trim();
			if (!val) return;
			const node = app.vault.getAbstractFileByPath(val);
			if (!(node instanceof TFolder)) {
				input.setAttr("style", "border-color: red;");
				return;
			}
			if (!settings.recipeFolders.includes(val)) {
				settings.recipeFolders.push(val);
				void save().then(() => renderFolderList());
			} else {
				renderFolderList();
			}
		});
	}
	renderFolderList();

	// ── Single path fields ──────────────────────────────────────────────────
	new Setting(container)
		.setName("Meal plan note path")
		.addText((t) => {
			t.setValue(settings.mealPlanPath).onChange(async (v) => {
				settings.mealPlanPath = v;
				await save();
			});
			new NotePathSuggest(app, t.inputEl);
		});

	new Setting(container)
		.setName("Grocery list note path")
		.addText((t) => {
			t.setValue(settings.groceryListPath).onChange(async (v) => {
				settings.groceryListPath = v;
				await save();
			});
			new NotePathSuggest(app, t.inputEl);
		});

	new Setting(container)
		.setName("Ingredients heading")
		.setDesc("Heading name that marks the ingredients section within a recipe note.")
		.addText((t) =>
			t.setValue(settings.ingredientsHeading).onChange(async (v) => {
				settings.ingredientsHeading = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Instructions heading")
		.setDesc("Heading name that marks the instructions section within a recipe note.")
		.addText((t) =>
			t.setValue(settings.instructionsHeading).onChange(async (v) => {
				settings.instructionsHeading = v;
				await save();
			})
		);
}
