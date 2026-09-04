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
	tab: "url" | "text" | "manual";
	url: string;
	text: string;
	titleOverride: string;
	folder: string;
}

/** A blank starting point for the Manual tab -- every string field empty, every
 * numeric/nullable field null, no ingredient/step/note groups. Manual entry
 * skips extraction entirely and hands this straight to the review stage. */
function blankRecipe(): ExtractedRecipe {
	return {
		title: "",
		description: "",
		heroImage: null,
		servings: null,
		prepTime: null,
		cookTime: null,
		totalTime: null,
		ingredientGroups: [],
		instructionGroups: [],
		notesGroups: [],
		sourceUrl: "",
		calories: null,
		protein: null,
		fat: null,
		carbs: null,
	};
}

export function renderInputStage(
	bodyEl: HTMLElement,
	footerEl: HTMLElement,
	app: App,
	settings: RecipeBoxSettings,
	state: InputStageState,
	onResult: (recipe: ExtractedRecipe, folder: string, warning: string | null) => void,
): void {
	// Tab switcher
	const tabs = bodyEl.createDiv({ cls: "rb-import-tabs" });
	const urlTab = tabs.createEl("button", { cls: "rb-import-tab", text: "From URL" });
	const textTab = tabs.createEl("button", { cls: "rb-import-tab", text: "From text" });
	const manualTab = tabs.createEl("button", { cls: "rb-import-tab", text: "Manual" });

	function setTab(tab: "url" | "text" | "manual"): void {
		state.tab = tab;
		urlTab.toggleClass("rb-import-tab--active", tab === "url");
		textTab.toggleClass("rb-import-tab--active", tab === "text");
		manualTab.toggleClass("rb-import-tab--active", tab === "manual");
		urlPane.toggle(tab === "url");
		textPane.toggle(tab === "text");
		manualPane.toggle(tab === "manual");
		submitBtn.setText(tab === "manual" ? "Continue" : "Import");
	}

	urlTab.addEventListener("click", () => setTab("url"));
	textTab.addEventListener("click", () => setTab("text"));
	manualTab.addEventListener("click", () => setTab("manual"));

	// URL pane
	const urlPane = bodyEl.createDiv({ cls: "rb-import-pane" });
	urlPane.createDiv({ cls: "rb-import-field-label", text: "Recipe URL" });
	const urlInput = urlPane.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "url", placeholder: "HTTPS://…" },
	});
	urlInput.value = state.url;
	const urlErrorBox = urlPane.createDiv({ cls: "rb-import-error-box" });
	urlErrorBox.hide();
	urlInput.addEventListener("input", () => {
		state.url = urlInput.value;
		urlErrorBox.empty();
		urlErrorBox.hide();
	});

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

	// Manual pane -- no fields of its own, the blank ExtractedRecipe is built
	// entirely on the review stage.
	const manualPane = bodyEl.createDiv({ cls: "rb-import-pane" });
	manualPane.createDiv({
		cls: "rb-import-field-label",
		text: "Start with a blank recipe and fill in every field on the next screen.",
	});

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

	const submitBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Import" });
	submitBtn.addEventListener("click", () => { void (async () => {
		if (state.tab === "manual") {
			onResult(blankRecipe(), state.folder, null);
			return;
		}
		submitBtn.disabled = true;
		submitBtn.setText("Importing…");
		urlErrorBox.empty();
		urlErrorBox.hide();
		try {
			if (state.tab === "url") {
				const result = await submitUrl(state.url);
				if (result.kind === "success") {
					onResult(result.recipe, state.folder, result.warning);
				} else {
					urlErrorBox.setText(result.message);
					urlErrorBox.show();
				}
			} else {
				const recipe = submitText(state.text, state.titleOverride);
				if (recipe) onResult(recipe, state.folder, null);
			}
		} finally {
			submitBtn.disabled = false;
			submitBtn.setText("Import");
		}
	})(); });

	setTab(state.tab);
}
