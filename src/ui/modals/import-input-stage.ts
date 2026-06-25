/**
 * Renders the URL / paste-text input stage of the import modal into the
 * provided body and footer elements (supplied by BaseModal's shell).
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { submitUrl, submitText, resolveDestinationFolder } from "./import-submit";

export interface InputStageState {
	tab: "url" | "text";
	url: string;
	text: string;
	titleOverride: string;
	folder: string;
}

export function renderInputStage(
	bodyEl: HTMLElement,
	footerEl: HTMLElement,
	app: App,
	settings: RecipeBoxSettings,
	state: InputStageState,
	onResult: (recipe: ExtractedRecipe, folder: string) => void,
): void {
	// Tab switcher
	const tabs = bodyEl.createDiv({ cls: "rb-import-tabs" });
	const urlTab = tabs.createEl("button", { cls: "rb-import-tab", text: "From URL" });
	const textTab = tabs.createEl("button", { cls: "rb-import-tab", text: "From text" });

	function setTab(tab: "url" | "text"): void {
		state.tab = tab;
		urlTab.toggleClass("rb-import-tab--active", tab === "url");
		textTab.toggleClass("rb-import-tab--active", tab === "text");
		urlPane.toggle(tab === "url");
		textPane.toggle(tab === "text");
	}

	urlTab.addEventListener("click", () => setTab("url"));
	textTab.addEventListener("click", () => setTab("text"));

	// URL pane
	const urlPane = bodyEl.createDiv({ cls: "rb-import-pane" });
	urlPane.createDiv({ cls: "rb-import-field-label", text: "Recipe URL" });
	const urlInput = urlPane.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "url", placeholder: "HTTPS://…" },
	});
	urlInput.value = state.url;
	urlInput.addEventListener("input", () => { state.url = urlInput.value; });

	// Text pane
	const textPane = bodyEl.createDiv({ cls: "rb-import-pane" });
	textPane.createDiv({ cls: "rb-import-field-label", text: "Title (optional)" });
	const titleInput = textPane.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "My recipe" },
	});
	titleInput.value = state.titleOverride;
	titleInput.addEventListener("input", () => { state.titleOverride = titleInput.value; });
	textPane.createDiv({ cls: "rb-import-field-label", text: "Paste recipe text" });
	const textArea = textPane.createEl("textarea", {
		cls: "rb-import-textarea rb-import-textarea--tall",
		attr: { placeholder: "Paste ingredients and instructions here…" },
	});
	textArea.value = state.text;
	textArea.addEventListener("input", () => { state.text = textArea.value; });

	// Shared folder field
	const folderSection = bodyEl.createDiv({ cls: "rb-import-folder-row" });
	folderSection.createDiv({ cls: "rb-import-field-label", text: "Destination folder" });
	const folderInput = folderSection.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "Recipes" },
	});
	if (!state.folder) state.folder = resolveDestinationFolder(settings);
	folderInput.value = state.folder;
	folderInput.addEventListener("input", () => { state.folder = folderInput.value; });
	new FolderSuggest(app, folderInput);

	const importBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Import" });
	importBtn.addEventListener("click", () => { void (async () => {
		importBtn.disabled = true;
		importBtn.setText("Importing…");
		try {
			let recipe: ExtractedRecipe | null = null;
			if (state.tab === "url") {
				recipe = await submitUrl(state.url);
			} else {
				recipe = submitText(state.text, state.titleOverride);
			}
			if (recipe) onResult(recipe, state.folder);
		} finally {
			importBtn.disabled = false;
			importBtn.setText("Import");
		}
	})(); });

	setTab(state.tab);
}
