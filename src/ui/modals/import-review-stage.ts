/**
 * Renders the review and edit stage of the import modal into the provided
 * body and footer elements (supplied by BaseModal's shell).
 */
import { App, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe, ImportedGroup } from "../../importer/recipe-extract-types";
import { groupsToTextarea, textareaToGroups } from "../../importer/recipe-group-textarea";
import { saveRecipe } from "./import-submit";
import { ConfirmModal } from "./confirm-modal";
import { openInRecipeView } from "../utils/open-in-recipe-view";
import { VaultImageSuggestModal } from "./vault-image-suggest-modal";
import { renderIngredientListEditor } from "./import-ingredient-editor";
import { renderStepListEditor } from "./import-step-editor";

function leadingInt(s: string | null): string {
	if (!s) return "";
	const m = s.match(/^\d+/);
	return m ? m[0] : "";
}

function parseNum(s: string): number | null {
	const n = Number(s.trim());
	return s.trim() !== "" && isFinite(n) ? n : null;
}

function flattenItems(groups: ImportedGroup[]): string[] {
	return groups.flatMap((g) => g.items);
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

export function renderReviewStage(
	bodyEl: HTMLElement,
	footerEl: HTMLElement,
	app: App,
	settings: RecipeBoxSettings,
	initial: ExtractedRecipe,
	folder: string,
	warning: string | null,
	onBack: () => void,
	onSaved: () => void,
): void {
	// Working copy — mutated by field inputs
	const recipe: ExtractedRecipe = { ...initial,
		ingredientGroups: [...initial.ingredientGroups],
		instructionGroups: [...initial.instructionGroups],
		notesGroups: [...initial.notesGroups],
	};

	if (warning) {
		bodyEl.createDiv({ cls: "rb-import-warning-box", text: warning });
	}

	// Best-effort preview of the image at its current (pre-download) URL or
	// vault path. The actual vault download happens later in saveRecipe -- this
	// is just a visual check of what's about to be saved. Silently omitted if
	// there's no heroImage or the source fails to load, rather than showing a
	// broken-image icon. Now that heroImage is directly editable (not just
	// something URL imports populate via scraping), the preview re-renders on
	// every change instead of being drawn once from the initial value.
	//
	// A plain <img src> can't load a vault-relative path directly -- it needs
	// Obsidian's resource URL for whatever file that path resolves to. URLs
	// and data: URIs fall straight through unchanged, since getFileByPath just
	// returns null for those and heroImage is used as-is.
	const previewWrap = bodyEl.createDiv();
	function renderPreview(): void {
		previewWrap.empty();
		if (!recipe.heroImage) return;
		const imgWrap = previewWrap.createDiv({ cls: "rb-import-image-preview" });
		const img = imgWrap.createEl("img", { attr: { alt: "" } });
		const vaultFile = app.vault.getFileByPath(recipe.heroImage);
		img.src = vaultFile ? app.vault.getResourcePath(vaultFile) : recipe.heroImage;
		img.addEventListener("error", () => imgWrap.remove());
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

	// Title and Image stay outside every section -- they're the two fields
	// worth seeing above everything else, not tucked under a heading.
	field(bodyEl, "Title", recipe.title, false, (v) => { recipe.title = v; });

	function setHeroImage(v: string): void {
		const trimmed = v.trim();
		recipe.heroImage = trimmed || null;
		renderPreview();
	}

	const imageField = bodyEl.createDiv({ cls: "rb-import-field" });
	imageField.createDiv({ cls: "rb-import-field-label", text: "Image" });
	const imageRow = imageField.createDiv({ cls: "rb-import-image-row" });
	const imageInput = imageRow.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "Image URL, or browse the vault" },
	});
	imageInput.value = recipe.heroImage ?? "";
	imageInput.addEventListener("input", () => setHeroImage(imageInput.value));

	const browseBtn = imageRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(browseBtn.createSpan({ cls: "rb-modal-btn-icon" }), "folder");
	browseBtn.createSpan({ text: "Browse vault" });
	browseBtn.addEventListener("click", () => {
		new VaultImageSuggestModal(app, (file) => {
			imageInput.value = file.path;
			setHeroImage(file.path);
		}).open();
	});

	renderPreview();

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

	// Ingredients: structured qty/unit/name/note entry instead of a free-text
	// group textarea. Sub-group headings (e.g. "For the sauce") from a scraped
	// import aren't representable in this form, so all groups are flattened
	// into one list on entry -- an accepted trade for a controlled, editable
	// list over free-text group editing.
	const ingredientsBody = importSection(bodyEl, "Ingredients");
	renderIngredientListEditor(ingredientsBody, flattenItems(recipe.ingredientGroups), (items) => {
		recipe.ingredientGroups = [{ name: null, items }];
	});

	// Steps: same structured entry pattern as Ingredients.
	const stepsBody = importSection(bodyEl, "Steps");
	renderStepListEditor(stepsBody, flattenItems(recipe.instructionGroups), (items) => {
		recipe.instructionGroups = [{ name: null, items }];
	});

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

	// Cancel (back) first, then Save (spec section 55)
	footerEl.createEl("button", { cls: "rb-shell-cancel-btn", text: "← back" })
		.addEventListener("click", onBack);

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
				(filePath) => { openInRecipeView(app, filePath); onSaved(); },
			);
		} finally {
			saveBtn.disabled = false;
			saveBtn.setText("Save recipe");
		}
	})(); });
}
