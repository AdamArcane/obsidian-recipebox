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
import { VaultImageSuggestModal } from "./vault-image-suggest-modal";
import { ImportFromUrlModal, ImportFromTextModal } from "./quick-import-modal";
import { renderIngredientListEditor } from "./import-ingredient-editor";
import { renderStepListEditor } from "./import-step-editor";
import { renderGroupListEditor } from "./import-group-list-editor";

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

function inlineRow(
	parent: HTMLElement,
	fields: Array<{ label: string; placeholder: string; value: string; onInput: (v: string) => void }>,
): void {
	const row = parent.createDiv({ cls: "rb-import-inline-row" });
	for (const f of fields) {
		const cell = row.createDiv({ cls: "rb-import-inline-cell" });
		cell.createSpan({ cls: "rb-import-inline-label", text: f.label });
		const input = cell.createEl("input", {
			cls: "rb-import-inline-input",
			attr: { type: "number", placeholder: f.placeholder },
		});
		input.value = f.value;
		input.addEventListener("input", () => f.onInput(input.value));
	}
}

// Deliberately its own class set rather than reusing rb-extra-card* -- those
// classes also back the recipe view's actual collapsible trailing-content
// cards (section-card.ts), and this section is never collapsible, so sharing
// the class would mean either dragging collapse behavior in here or stripping
// it there. All sections render open, all the time -- the earlier per-section
// collapse (Ingredients/Steps hidden by default) was the original complaint
// this modal exists to fix, and full accordion behavior for every section
// turned out to just be more clicking to see the same always-needed content.
function importSection(parent: HTMLElement, title: string): HTMLElement {
	const card = parent.createDiv({ cls: "rb-import-section" });
	card.createDiv({ cls: "rb-import-section-header", text: title });
	return card.createDiv({ cls: "rb-import-section-body" });
}

// Grows a textarea to fit its content instead of scrolling internally --
// overflow stays hidden and resize is disabled via the
// rb-import-textarea--auto CSS class. A ResizeObserver (not a fixed rAF
// delay) drives the recalculation, since it fires whenever the textarea's
// actual box size changes for any reason (mobile layout settling after the
// modal opens, orientation change), not just on typed input. Also still
// recalculates on input, since typed content can grow the textarea without
// any external size change to trigger the observer.
function autosizeTextarea(ta: HTMLTextAreaElement): void {
	const resize = (): void => {
		ta.setCssProps({ height: "auto" });
		ta.setCssProps({ height: `${ta.scrollHeight}px` });
	};
	ta.addEventListener("input", resize);
	new ResizeObserver(resize).observe(ta);
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

	function field(parent: HTMLElement, label: string, value: string, multiline: false, onInput: (v: string) => void): void;
	function field(parent: HTMLElement, label: string, value: string, multiline: true, onInput: (v: string) => void, cls?: string): void;
	function field(parent: HTMLElement, label: string, value: string, multiline: boolean, onInput: (v: string) => void, cls?: string): void {
		const wrap = parent.createDiv({ cls: "rb-import-field" });
		wrap.createDiv({ cls: "rb-import-field-label", text: label });
		if (multiline) {
			const ta = wrap.createEl("textarea", { cls: cls ?? "rb-import-textarea", attr: { rows: "4" } });
			ta.value = value;
			ta.addEventListener("input", () => onInput(ta.value));
			autosizeTextarea(ta);
		} else {
			const inp = wrap.createEl("input", { cls: "rb-import-text-input", attr: { type: "text" } });
			inp.value = value;
			inp.addEventListener("input", () => onInput(inp.value));
		}
	}

	// Title and Image stay outside every section -- they're worth seeing above
	// everything else, not tucked under a heading. Half-width side by side,
	// with a thumbnail preview filling the other half so the image is never
	// more than a glance away while editing the URL/vault path next to it.
	const titleImageRow = bodyEl.createDiv({ cls: "rb-import-title-image-row" });
	const titleImageLeft = titleImageRow.createDiv({ cls: "rb-import-title-image-col" });
	const previewWrap = titleImageRow.createDiv({ cls: "rb-import-title-image-col" });

	field(titleImageLeft, "Title", recipe.title, false, (v) => { recipe.title = v; });

	// Best-effort thumbnail of the image at its current (pre-download) URL,
	// vault path, or data: URI. The actual vault download/decode happens later
	// in saveRecipe -- this is just a visual check of what's about to be
	// saved. Falls back to a placeholder icon if there's no heroImage or the
	// source fails to load, rather than showing a broken-image icon.
	//
	// A plain <img src> can't load a vault-relative path directly -- it needs
	// Obsidian's resource URL for whatever file that path resolves to. URLs
	// and data: URIs fall straight through unchanged, since getFileByPath just
	// returns null for those and heroImage is used as-is.
	function renderPreview(): void {
		previewWrap.empty();
		const box = previewWrap.createDiv({ cls: "rb-import-image-thumb" });
		if (!recipe.heroImage) {
			box.addClass("rb-import-image-thumb--empty");
			setIcon(box.createDiv({ cls: "rb-import-image-thumb-icon" }), "image");
			return;
		}
		const img = box.createEl("img", { attr: { alt: "" } });
		const vaultFile = app.vault.getFileByPath(recipe.heroImage);
		img.src = vaultFile ? app.vault.getResourcePath(vaultFile) : recipe.heroImage;
		img.addEventListener("error", () => {
			box.empty();
			box.addClass("rb-import-image-thumb--empty");
			setIcon(box.createDiv({ cls: "rb-import-image-thumb-icon" }), "image");
		});
	}

	// Text field mirrors heroImage directly for a URL, but a data: URI from an
	// uploaded file is far too long to usefully show or edit inline -- the
	// field goes read-only with an explanatory placeholder instead, and
	// Remove is the only way back to an editable URL.
	function refreshImageControls(): void {
		const isUpload = !!recipe.heroImage?.startsWith("data:");
		imageInput.value = isUpload ? "" : recipe.heroImage ?? "";
		imageInput.disabled = isUpload;
		imageInput.placeholder = isUpload ? "Image uploaded from this device" : "Image URL, or browse the vault";
		removeBtn.toggle(!!recipe.heroImage);
	}

	function setHeroImage(v: string): void {
		const trimmed = v.trim();
		recipe.heroImage = trimmed || null;
		renderPreview();
		refreshImageControls();
	}

	const imageField = titleImageLeft.createDiv({ cls: "rb-import-field" });
	imageField.createDiv({ cls: "rb-import-field-label", text: "Image" });
	const imageInput = imageField.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "Image URL, or browse the vault" },
	});
	imageInput.addEventListener("input", () => setHeroImage(imageInput.value));

	const imageBtnRow = imageField.createDiv({ cls: "rb-import-image-btn-row" });

	const browseBtn = imageBtnRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(browseBtn.createSpan({ cls: "rb-modal-btn-icon" }), "folder");
	browseBtn.createSpan({ text: "Browse vault" });
	browseBtn.addEventListener("click", () => {
		new VaultImageSuggestModal(app, (file) => { setHeroImage(file.path); }).open();
	});

	const uploadBtn = imageBtnRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(uploadBtn.createSpan({ cls: "rb-modal-btn-icon" }), "upload");
	uploadBtn.createSpan({ text: "Upload from PC" });
	const fileInput = imageBtnRow.createEl("input", {
		cls: "rb-hidden",
		attr: { type: "file", accept: "image/*" },
	});
	uploadBtn.addEventListener("click", () => fileInput.click());
	fileInput.addEventListener("change", () => {
		const file = fileInput.files?.[0];
		fileInput.value = "";
		if (!file) return;
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") setHeroImage(reader.result);
		});
		reader.readAsDataURL(file);
	});

	const removeBtn = imageBtnRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(removeBtn.createSpan({ cls: "rb-modal-btn-icon" }), "x");
	removeBtn.createSpan({ text: "Remove" });
	removeBtn.addEventListener("click", () => setHeroImage(""));

	renderPreview();
	refreshImageControls();

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
	field(basicBody, "Description", recipe.description, true, (v) => { recipe.description = v; }, "rb-import-textarea rb-import-textarea--auto");

	const timingValues = {
		prep: recipe.prepTime !== null ? String(recipe.prepTime) : "",
		cook: recipe.cookTime !== null ? String(recipe.cookTime) : "",
		total: recipe.totalTime !== null ? String(recipe.totalTime) : "",
	};
	basicBody.createDiv({ cls: "rb-import-field-label", text: "Timing (minutes)" });
	inlineRow(basicBody, [
		{ label: "Prep", placeholder: "15", value: timingValues.prep, onInput: (v) => { recipe.prepTime = parseNum(v); timingValues.prep = v; } },
		{ label: "Cook", placeholder: "30", value: timingValues.cook, onInput: (v) => { recipe.cookTime = parseNum(v); timingValues.cook = v; } },
		{ label: "Total", placeholder: "45", value: timingValues.total, onInput: (v) => { recipe.totalTime = parseNum(v); timingValues.total = v; } },
	]);

	// Servings (leading-int extraction)
	const servWrap = basicBody.createDiv({ cls: "rb-import-field" });
	servWrap.createDiv({ cls: "rb-import-field-label", text: "Servings" });
	const servInput = servWrap.createEl("input", {
		cls: "rb-import-text-input rb-import-text-input--short",
		attr: { type: "number", min: "1", placeholder: "4" },
	});
	servInput.value = leadingInt(recipe.servings);
	servInput.addEventListener("input", () => { recipe.servings = servInput.value || null; });

	// Ingredients: structured qty/unit/name/note entry, grouped. A single
	// unnamed group renders as a flat list with no header chrome; naming it or
	// adding a second group (via "Add group") brings up group headers with
	// rename/reorder/delete for all groups. See import-group-list-editor.ts.
	const ingredientsBody = importSection(bodyEl, "Ingredients");
	renderGroupListEditor(
		ingredientsBody,
		recipe.ingredientGroups,
		renderIngredientListEditor,
		(groups) => { recipe.ingredientGroups = groups; },
		{ addGroup: "Add group", namePlaceholder: "Group name (optional)" },
	);

	// Steps: same grouped structured entry pattern as Ingredients.
	const stepsBody = importSection(bodyEl, "Steps");
	renderGroupListEditor(
		stepsBody,
		recipe.instructionGroups,
		renderStepListEditor,
		(groups) => { recipe.instructionGroups = groups; },
		{ addGroup: "Add group", namePlaceholder: "Group name (optional)" },
	);

	// Notes: still free text -- there's no fixed shape to a note the way there
	// is to an ingredient or a step, so a structured form wouldn't fit.
	const notesBody = importSection(bodyEl, "Notes");
	const notesTa = notesBody.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--auto" });
	notesTa.value = groupsToTextarea(recipe.notesGroups);
	notesTa.addEventListener("input", () => { recipe.notesGroups = textareaToGroups(notesTa.value); });
	autosizeTextarea(notesTa);

	// Nutrition: its own section.
	const nutritionBody = importSection(bodyEl, "Nutrition");
	const nutValues = {
		cal: recipe.calories !== null ? String(recipe.calories) : "",
		prot: recipe.protein !== null ? String(recipe.protein) : "",
		fat: recipe.fat !== null ? String(recipe.fat) : "",
		carb: recipe.carbs !== null ? String(recipe.carbs) : "",
	};
	nutritionBody.createDiv({ cls: "rb-import-field-label", text: "Nutrition (per serving)" });
	inlineRow(nutritionBody, [
		{ label: "Calories", placeholder: "350", value: nutValues.cal, onInput: (v) => { recipe.calories = parseNum(v); } },
		{ label: "Protein g", placeholder: "20", value: nutValues.prot, onInput: (v) => { recipe.protein = parseNum(v); } },
		{ label: "Fat g", placeholder: "12", value: nutValues.fat, onInput: (v) => { recipe.fat = parseNum(v); } },
		{ label: "Carbs g", placeholder: "40", value: nutValues.carb, onInput: (v) => { recipe.carbs = parseNum(v); } },
	]);

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
