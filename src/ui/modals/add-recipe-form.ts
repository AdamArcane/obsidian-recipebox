/**
 * Renders the Add Recipe form -- the plugin's one screen for creating a
 * recipe note, whether typed by hand or prefilled via the Import from
 * URL/Text popups (quick-import-modal.ts) -- into the body/footer elements
 * supplied by BaseModal's shell.
 */
import { App, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { FolderSuggest } from "../components/folder-suggest";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { groupsToTextarea, textareaToGroups } from "../../importer/recipe-group-textarea";
import { saveRecipe } from "./import-submit";
import { ConfirmModal } from "./confirm-modal";
import { openInRecipeView } from "../utils/open-in-recipe-view";
import { ImportFromUrlModal, ImportFromTextModal } from "./quick-import-modal";
import {
	importSection, textField, textareaField, titleImageRow, renderImageField,
	renderTimingFields, renderIngredientsEditor, renderStepsEditor, renderNotesTextarea,
	renderNutritionFields,
} from "./add-recipe-form-sections";

function leadingInt(s: string | null): string {
	if (!s) return "";
	const m = s.match(/^\d+/);
	return m ? m[0] : "";
}

function parseNum(s: string): number | null {
	const n = Number(s.trim());
	return s.trim() !== "" && isFinite(n) ? n : null;
}

// Used to decide whether Import from URL/Text needs a confirmation first --
// a truly blank form (the default state) can just take the import, but
// anything already typed in is worth a confirm before it's discarded.
function isBlankRecipe(r: ExtractedRecipe): boolean {
	return !r.title.trim()
		&& !r.description.trim()
		&& !r.heroImage
		&& r.servings === null
		&& r.prepTime === null
		&& r.cookTime === null
		&& r.totalTime === null
		&& r.calories === null
		&& r.protein === null
		&& r.fat === null
		&& r.carbs === null
		&& r.ingredientGroups.every((g) => g.items.length === 0)
		&& r.instructionGroups.every((g) => g.items.length === 0)
		&& r.notesGroups.every((g) => g.items.length === 0);
}

export function renderAddRecipeForm(
	bodyEl: HTMLElement,
	footerEl: HTMLElement,
	app: App,
	settings: RecipeBoxSettings,
	initial: ExtractedRecipe,
	initialFolder: string,
	warning: string | null,
	callbacks: {
		onImported: (recipe: ExtractedRecipe, warning: string | null) => void;
		onFolderChange: (folder: string) => void;
		onCancel: () => void;
		onSaved: () => void;
	},
): void {
	// Mutable so the folder field below can change where Save writes to; also
	// reported back up via onFolderChange so it survives a full form re-render
	// if Import from URL/Text lands (see applyImportedRecipe below).
	let folder = initialFolder;

	// Working copy — mutated by field inputs
	const recipe: ExtractedRecipe = { ...initial,
		ingredientGroups: [...initial.ingredientGroups],
		instructionGroups: [...initial.instructionGroups],
		notesGroups: [...initial.notesGroups],
	};

	// Import from URL/Text replace the whole form -- if there's nothing to
	// lose, just apply it, otherwise confirm first since it discards whatever
	// was typed in.
	function applyImportedRecipe(imported: ExtractedRecipe, importWarning: string | null): void {
		if (isBlankRecipe(recipe)) {
			callbacks.onImported(imported, importWarning);
			return;
		}
		new ConfirmModal(
			app,
			"Replace current recipe?",
			"Importing will replace everything currently entered in this form.",
			"Replace",
			{ destructive: true, onConfirm: () => callbacks.onImported(imported, importWarning) },
		).open();
	}

	const quickImportRow = bodyEl.createDiv({ cls: "rb-import-quick-row" });
	const importUrlBtn = quickImportRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(importUrlBtn.createSpan({ cls: "rb-modal-btn-icon" }), "link");
	importUrlBtn.createSpan({ text: "Import from URL" });
	importUrlBtn.addEventListener("click", () => {
		new ImportFromUrlModal(app, (imported, importWarning) => applyImportedRecipe(imported, importWarning)).open();
	});

	const importTextBtn = quickImportRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(importTextBtn.createSpan({ cls: "rb-modal-btn-icon" }), "clipboard-paste");
	importTextBtn.createSpan({ text: "Import from text" });
	importTextBtn.addEventListener("click", () => {
		new ImportFromTextModal(app, (imported) => applyImportedRecipe(imported, null)).open();
	});

	if (warning) {
		bodyEl.createDiv({ cls: "rb-import-warning-box", text: warning });
	}

	// Title and Image stay outside every section -- they're worth seeing above
	// everything else, not tucked under a heading. Half-width side by side,
	// with a thumbnail preview filling the other half so the image is never
	// more than a glance away while editing the URL/vault path next to it.
	const { left: titleImageLeft, preview: previewWrap } = titleImageRow(bodyEl);

	textField(titleImageLeft, "Title", recipe.title, (v) => { recipe.title = v; });
	renderImageField(app, titleImageLeft, previewWrap, recipe.heroImage, (img) => { recipe.heroImage = img; });

	// Destination folder -- stacked under Image in the same half-width
	// column, not full-width. Changes report back up via onFolderChange so
	// the value survives a full form re-render if an import lands.
	const folderField = titleImageLeft.createDiv({ cls: "rb-import-field" });
	folderField.createDiv({ cls: "rb-import-field-label", text: "Destination folder" });
	const folderInput = folderField.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "Recipes" },
	});
	folderInput.value = folder;
	folderInput.addEventListener("input", () => {
		folder = folderInput.value;
		callbacks.onFolderChange(folder);
	});
	new FolderSuggest(app, folderInput);

	// Basic info: description, timing, servings.
	const basicBody = importSection(bodyEl, "Basic info");
	textareaField(basicBody, "Description", recipe.description, (v) => { recipe.description = v; }, "rb-import-textarea rb-import-textarea--auto");

	renderTimingFields(
		basicBody,
		{
			prep: recipe.prepTime !== null ? String(recipe.prepTime) : "",
			cook: recipe.cookTime !== null ? String(recipe.cookTime) : "",
			total: recipe.totalTime !== null ? String(recipe.totalTime) : "",
			// Leading-int extraction: the field is a plain number input here.
			servings: leadingInt(recipe.servings),
		},
		(key, v) => {
			if (key === "prep") recipe.prepTime = parseNum(v);
			else if (key === "cook") recipe.cookTime = parseNum(v);
			else if (key === "total") recipe.totalTime = parseNum(v);
			else recipe.servings = v || null;
		},
		"number",
	);

	renderIngredientsEditor(app, importSection(bodyEl, "Ingredients"), recipe.ingredientGroups, settings, (groups) => { recipe.ingredientGroups = groups; });
	renderStepsEditor(app, importSection(bodyEl, "Steps"), recipe.instructionGroups, (groups) => { recipe.instructionGroups = groups; });

	// Notes: still free text -- there's no fixed shape to a note the way there
	// is to an ingredient or a step, so a structured form wouldn't fit.
	renderNotesTextarea(
		importSection(bodyEl, "Notes"),
		groupsToTextarea(recipe.notesGroups),
		(v) => { recipe.notesGroups = textareaToGroups(v); },
	);

	renderNutritionFields(
		importSection(bodyEl, "Nutrition"),
		"Nutrition (per serving)",
		{
			cal: recipe.calories !== null ? String(recipe.calories) : "",
			prot: recipe.protein !== null ? String(recipe.protein) : "",
			fat: recipe.fat !== null ? String(recipe.fat) : "",
			carb: recipe.carbs !== null ? String(recipe.carbs) : "",
		},
		(key, v) => {
			if (key === "cal") recipe.calories = parseNum(v);
			else if (key === "prot") recipe.protein = parseNum(v);
			else if (key === "fat") recipe.fat = parseNum(v);
			else recipe.carbs = parseNum(v);
		},
	);

	// Cancel first, then Save (spec section 55)
	footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "Cancel" })
		.addEventListener("click", callbacks.onCancel);

	const saveBtn = footerEl.createEl("button", { cls: "mod-cta", text: "Save recipe" });
	saveBtn.addEventListener("click", () => { void (async () => {
		if (!recipe.title.trim()) recipe.title = "Untitled recipe";
		saveBtn.disabled = true;
		saveBtn.setText("Saving…");
		try {
			await saveRecipe(
				app,
				recipe,
				folder,
				settings,
				(path, proceed) => {
					new ConfirmModal(
						app,
						"Overwrite existing file?",
						`A note already exists at "${path}". Replace it?`,
						"Overwrite",
						{ destructive: true, onConfirm: () => void proceed() },
					).open();
				},
				(filePath) => { openInRecipeView(app, filePath); callbacks.onSaved(); },
			);
		} finally {
			saveBtn.disabled = false;
			saveBtn.setText("Save recipe");
		}
	})(); });
}
