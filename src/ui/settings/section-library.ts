/**
 * Settings section for library configuration — recipe folders, auto-open
 * behavior, and the recipe type value used to identify recipe files.
 */
import { App, setIcon, Setting, TFolder } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";
import { DEFAULT_SETTINGS } from "../../settings/settings-defaults";

const FALLBACK_RECIPE_FOLDER = DEFAULT_SETTINGS.recipeFolders[0] ?? "Recipes";

export function renderSectionLibrary(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Recipe library").setHeading();

	// The folder list is appended directly inside this card so it stays one visual unit.
	const folderDesc = activeDocument.createDocumentFragment();
	folderDesc.appendText("Folders the plugin scans for recipe notes. ");
	folderDesc.createEl("strong", { text: "At least one is required" });
	folderDesc.appendText("; add \"/\" to scan the entire vault instead of a specific folder.");

	const folderSetting = new Setting(container)
		.setName("Recipe folders")
		.setDesc(folderDesc);
	folderSetting.settingEl.addClass("rb-settings-folder-setting");

	const folderList = folderSetting.settingEl.createDiv({ cls: "rb-settings-folder-list" });

	function renderFolderRows(): void {
		folderList.empty();

		settings.recipeFolders.forEach((folder, i) => {
			const row = folderList.createDiv({ cls: "rb-settings-folder-row" });
			row.createSpan({ cls: "rb-settings-folder-label", text: folder === "/" ? "/ (entire vault)" : folder });
			const del = row.createEl("button", {
				cls: "rb-settings-folder-delete clickable-icon",
				attr: { title: "Remove" },
			});
			setIcon(del, "trash-2");
			del.addEventListener("click", () => {
				settings.recipeFolders.splice(i, 1);
				// Removing the last folder would silently fall back to scanning the
				// entire vault (the underlying scope check treats an empty list that
				// way). Restore the default folder instead, so "scan everything" only
				// ever happens when someone explicitly adds "/".
				if (settings.recipeFolders.length === 0) {
					settings.recipeFolders.push(FALLBACK_RECIPE_FOLDER);
				}
				void save().then(() => { renderFolderRows(); updateWarning(); });
			});
		});

		// Add-folder row: text input wired to FolderSuggest; commits on valid folder pick or Enter.
		const addRow = folderList.createDiv({ cls: "rb-settings-folder-add-row" });
		const input = addRow.createEl("input", {
			cls: "rb-settings-folder-input",
			attr: { type: "text", placeholder: "Add a folder..." },
		});
		new FolderSuggest(app, input);

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
			updateWarning();
		}

		input.addEventListener("input", () => { void tryCommit(); });
		input.addEventListener("keydown", (e) => { if (e.key === "Enter") void tryCommit(); });
	}
	renderFolderRows();

	const warningEl = container.createDiv({ cls: "rb-settings-warning rb-hidden" });

	function updateWarning(): void {
		warningEl.empty();
		const wholeVault = settings.recipeFolders.includes("/");
		const noType = !settings.recipeType.trim();
		if (!wholeVault || !noType) {
			warningEl.addClass("rb-hidden");
			return;
		}
		warningEl.removeClass("rb-hidden");

		const icon = warningEl.createSpan({ cls: "rb-settings-warning-icon" });
		setIcon(icon, "alert-triangle");
		warningEl.createSpan({
			cls: "rb-settings-warning-text",
			text: "Scanning the entire vault (\"/\") with no recipe type value set means every note in your vault will be treated as a recipe. Set a recipe type value below to narrow this, or replace \"/\" with a specific folder.",
		});
	}
	updateWarning();

	new Setting(container)
		.setName("Recipe type value")
		.setDesc("Notes whose recipe type property matches this value are treated as recipes. When recipe folders are also set, both must match.")
		.addText((t) =>
			t.setValue(settings.recipeType).onChange(async (v) => {
				settings.recipeType = v;
				await save();
				updateWarning();
			})
		);

	new Setting(container)
		.setName("Open gallery when clicking a recipe folder")
		.setDesc("Clicking a recipe folder in the file explorer opens the recipe gallery filtered to that folder, instead of expanding it.")
		.addToggle((t) =>
			t.setValue(settings.openGalleryOnFolderClick).onChange(async (v) => {
				settings.openGalleryOnFolderClick = v;
				await save();
				rerender();
			})
		);

	if (settings.openGalleryOnFolderClick) {
		new Setting(container)
			.setName("Also apply to subfolders")
			.setDesc("Clicking a subfolder inside a recipe folder opens the gallery filtered to that subfolder specifically.")
			.addToggle((t) =>
				t.setValue(settings.openGalleryOnFolderClickSubfolders).onChange(async (v) => {
					settings.openGalleryOnFolderClickSubfolders = v;
					await save();
				})
			);
	}
}
