/**
 * Settings section for library configuration — recipe folders, type property
 * name, and recipe type value used to identify recipe files.
 */
import { App, Setting, TFolder } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";

export function renderSectionLibrary(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	_rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Recipe library").setHeading();

	const folderSetting = new Setting(container)
		.setName("Recipe folders")
		.setDesc("Folders the plugin scans for recipe notes. Leave empty to scan the entire vault.");

	const folderList = folderSetting.settingEl.createDiv("rb-settings-folder-list");

	function renderFolderRows(): void {
		folderList.empty();

		settings.recipeFolders.forEach((folder, i) => {
			const row = folderList.createDiv("rb-settings-folder-row");
			row.createSpan({ cls: "rb-settings-folder-label", text: folder });
			const del = row.createEl("button", { cls: "rb-settings-folder-delete", text: "×" });
			del.addEventListener("click", () => {
				settings.recipeFolders.splice(i, 1);
				void save().then(() => renderFolderRows());
			});
		});

		const addBtn = folderList.createEl("button", { cls: "rb-settings-folder-add", text: "+ add" });
		addBtn.addEventListener("click", () => {
			addBtn.remove();
			const row = folderList.createDiv("rb-settings-folder-row rb-settings-folder-row--input");
			const input = row.createEl("input", { type: "text", placeholder: "e.g. Recipes/" });
			new FolderSuggest(app, input);
			input.focus();

			async function tryCommit(): Promise<void> {
				const raw = input.value.trim().replace(/\/$/, "");
				const lookupPath = raw === "" ? "/" : raw;
				const node = lookupPath === "/"
					? app.vault.getRoot()
					: app.vault.getAbstractFileByPath(lookupPath);
				if (!(node instanceof TFolder)) return;
				const savePath = node.path === "" ? "/" : node.path;
				if (!settings.recipeFolders.includes(savePath)) {
					settings.recipeFolders.push(savePath);
					await save();
				}
				renderFolderRows();
			}

			input.addEventListener("input", () => { void tryCommit(); });
			input.addEventListener("keydown", (e) => { if (e.key === "Enter") void tryCommit(); });
		});
	}
	renderFolderRows();

	new Setting(container)
		.setName("Recipe type property")
		.setDesc("Which frontmatter property holds the note-type value (default: type).")
		.addText((t) =>
			t.setPlaceholder("Type").setValue(settings.recipeTypePropertyName).onChange(async (v) => {
				settings.recipeTypePropertyName = v.trim() || "type";
				await save();
			})
		);

	new Setting(container)
		.setName("Recipe type value")
		.setDesc("Notes whose recipe type property matches this value are treated as recipes. When recipe folders are also set, both must match.")
		.addText((t) =>
			t.setValue(settings.recipeType).onChange(async (v) => {
				settings.recipeType = v;
				await save();
			})
		);
}
