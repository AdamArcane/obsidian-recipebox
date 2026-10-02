/**
 * Per-section builders shared by the Add Recipe form and the Edit Recipe
 * form: image, timing/servings, ingredients, steps, notes, nutrition. Each
 * takes initial values plus change callbacks and owns no save logic; the two
 * forms decide how values map to a draft and what "dirty" means.
 */
import { App, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ImportedGroup } from "../../importer/recipe-extract-types";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { VaultImageSuggestModal } from "./vault-image-suggest-modal";
import { renderIngredientListEditor } from "./import-ingredient-editor";
import { renderStepListEditor } from "./import-step-editor";
import { renderGroupListEditor } from "./import-group-list-editor";

export interface InlineField {
	label: string;
	placeholder: string;
	value: string;
	onInput: (v: string) => void;
}

export function inlineRow(parent: HTMLElement, fields: InlineField[], inputType: "number" | "text" = "number"): void {
	const row = parent.createDiv({ cls: "rb-import-inline-row" });
	for (const f of fields) {
		const cell = row.createDiv({ cls: "rb-import-inline-cell" });
		cell.createSpan({ cls: "rb-import-inline-label", text: f.label });
		const input = cell.createEl("input", {
			cls: "rb-import-inline-input",
			attr: { type: inputType, placeholder: f.placeholder },
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
export function importSection(parent: HTMLElement, title: string): HTMLElement {
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
export function autosizeTextarea(ta: HTMLTextAreaElement): void {
	const resize = (): void => {
		ta.setCssProps({ height: "auto" });
		ta.setCssProps({ height: `${ta.scrollHeight}px` });
	};
	ta.addEventListener("input", resize);
	new ResizeObserver(resize).observe(ta);
}

export function textField(parent: HTMLElement, label: string, value: string, onInput: (v: string) => void): HTMLInputElement {
	const wrap = parent.createDiv({ cls: "rb-import-field" });
	wrap.createDiv({ cls: "rb-import-field-label", text: label });
	const inp = wrap.createEl("input", { cls: "rb-import-text-input", attr: { type: "text" } });
	inp.value = value;
	inp.addEventListener("input", () => onInput(inp.value));
	return inp;
}

export function textareaField(
	parent: HTMLElement,
	label: string,
	value: string,
	onInput: (v: string) => void,
	cls = "rb-import-textarea",
): void {
	const wrap = parent.createDiv({ cls: "rb-import-field" });
	wrap.createDiv({ cls: "rb-import-field-label", text: label });
	const ta = wrap.createEl("textarea", { cls, attr: { rows: "4" } });
	ta.value = value;
	ta.addEventListener("input", () => onInput(ta.value));
	autosizeTextarea(ta);
}

/** Title/Image sit above every section: left column fields, right column thumbnail. */
export function titleImageRow(bodyEl: HTMLElement): { left: HTMLElement; preview: HTMLElement } {
	const row = bodyEl.createDiv({ cls: "rb-import-title-image-row" });
	const left = row.createDiv({ cls: "rb-import-title-image-col" });
	const preview = row.createDiv({ cls: "rb-import-title-image-col" });
	return { left, preview };
}

// Best-effort thumbnail of the image at its current (pre-download) URL,
// vault path, or data: URI. Falls back to a placeholder icon if there's no
// image or the source fails to load, rather than showing a broken-image icon.
//
// A plain <img src> can't load a vault-relative path directly -- it needs
// Obsidian's resource URL for whatever file that path resolves to. URLs
// and data: URIs fall straight through unchanged, since getFileByPath just
// returns null for those and the value is used as-is.
export function renderImagePreview(app: App, previewWrap: HTMLElement, image: string | null): void {
	previewWrap.empty();
	const box = previewWrap.createDiv({ cls: "rb-import-image-thumb" });
	const showPlaceholder = (): void => {
		box.empty();
		box.addClass("rb-import-image-thumb--empty");
		setIcon(box.createDiv({ cls: "rb-import-image-thumb-icon" }), "image");
	};
	if (!image) { showPlaceholder(); return; }
	// resolveImagePath understands wikilinks/embeds and shortened vault links,
	// which a plain getFileByPath lookup missed: an existing note's image
	// (often stored as [[pic.png]]) showed as the empty placeholder.
	// data: URIs (device uploads) have no "//" so ABSOLUTE_URL_RE in
	// resolveImagePath doesn't match them and they'd be looked up as vault
	// paths; that regression made uploads preview as the empty placeholder.
	const src = image.startsWith("data:") ? image : resolveImagePath(app, image);
	if (!src) { showPlaceholder(); return; }
	const img = box.createEl("img", { attr: { alt: "" } });
	img.src = src;
	img.addEventListener("error", showPlaceholder);
}

export function renderImageField(
	app: App,
	parent: HTMLElement,
	previewWrap: HTMLElement,
	initial: string | null,
	onChange: (image: string | null) => void,
): void {
	let current = initial;
	// Only known for the session's own upload; the data URI itself carries no name.
	let uploadName: string | null = null;

	// Text field mirrors the value directly for a URL, but a data: URI from an
	// uploaded file is far too long to usefully show or edit inline -- the
	// field goes read-only with an explanatory placeholder instead, and
	// Remove is the only way back to an editable URL.
	function refreshControls(): void {
		const isUpload = !!current?.startsWith("data:");
		imageInput.value = isUpload ? uploadName ?? "" : current ?? "";
		imageInput.disabled = isUpload;
		imageInput.placeholder = isUpload ? "Image uploaded from this device" : "Image URL, or browse the vault";
		removeBtn.toggle(!!current);
	}

	function setImage(v: string, fileName: string | null = null): void {
		current = v.trim() || null;
		uploadName = fileName;
		renderImagePreview(app, previewWrap, current);
		refreshControls();
		onChange(current);
	}

	const imageField = parent.createDiv({ cls: "rb-import-field" });
	imageField.createDiv({ cls: "rb-import-field-label", text: "Image" });
	const imageInput = imageField.createEl("input", {
		cls: "rb-import-text-input",
		attr: { type: "text", placeholder: "Image URL, or browse the vault" },
	});
	imageInput.addEventListener("input", () => setImage(imageInput.value));

	const imageBtnRow = imageField.createDiv({ cls: "rb-import-image-btn-row" });

	const browseBtn = imageBtnRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(browseBtn.createSpan({ cls: "rb-modal-btn-icon" }), "folder");
	browseBtn.createSpan({ text: "Browse vault" });
	browseBtn.addEventListener("click", () => {
		new VaultImageSuggestModal(app, (file) => { setImage(file.path); }).open();
	});

	{
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
				if (typeof reader.result === "string") setImage(reader.result, file.name);
			});
			reader.readAsDataURL(file);
		});
	}

	const removeBtn = imageBtnRow.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	setIcon(removeBtn.createSpan({ cls: "rb-modal-btn-icon" }), "x");
	removeBtn.createSpan({ text: "Remove" });
	removeBtn.addEventListener("click", () => setImage(""));

	renderImagePreview(app, previewWrap, current);
	refreshControls();
}

export type TimingKey = "prep" | "cook" | "total" | "servings";

export interface TimingValues { prep: string; cook: string; total: string; servings: string }

/**
 * Timing row plus servings. Create mode uses number inputs; edit mode uses
 * text so a stored `1h 30m` or `4-6` is shown and kept as-is.
 */
export function renderTimingFields(
	parent: HTMLElement,
	values: TimingValues,
	onInput: (key: TimingKey, value: string) => void,
	inputType: "number" | "text",
): void {
	parent.createDiv({
		cls: "rb-import-field-label",
		text: inputType === "number" ? "Timing (minutes)" : "Timing",
	});
	inlineRow(parent, [
		{ label: "Prep", placeholder: "15", value: values.prep, onInput: (v) => onInput("prep", v) },
		{ label: "Cook", placeholder: "30", value: values.cook, onInput: (v) => onInput("cook", v) },
		{ label: "Total", placeholder: "45", value: values.total, onInput: (v) => onInput("total", v) },
	], inputType);

	const servWrap = parent.createDiv({ cls: "rb-import-field" });
	servWrap.createDiv({ cls: "rb-import-field-label", text: "Servings" });
	const attr: Record<string, string> = inputType === "number" ? { type: "number", min: "1", placeholder: "4" } : { type: "text", placeholder: "4" };
	const servInput = servWrap.createEl("input", {
		cls: "rb-import-text-input rb-import-text-input--short",
		attr,
	});
	servInput.value = values.servings;
	servInput.addEventListener("input", () => onInput("servings", servInput.value));
}

// Ingredients: structured qty/unit/name/note entry, grouped. A single
// unnamed group renders as a flat list with no header chrome; naming it or
// adding a second group (via "Add group") brings up group headers with
// rename/reorder/delete for all groups. See import-group-list-editor.ts.
export function renderIngredientsEditor(
	app: App,
	parent: HTMLElement,
	groups: ImportedGroup[],
	settings: RecipeBoxSettings,
	onChange: (groups: ImportedGroup[]) => void,
): void {
	renderGroupListEditor(
		app,
		parent,
		groups,
		(body, items, onItems, options) => renderIngredientListEditor(body, items, onItems, settings, options),
		onChange,
		{ addGroup: "Add group", namePlaceholder: "Group name (optional)" },
	);
}

// Steps: same grouped structured entry pattern as Ingredients.
export function renderStepsEditor(
	app: App,
	parent: HTMLElement,
	groups: ImportedGroup[],
	onChange: (groups: ImportedGroup[]) => void,
): void {
	renderGroupListEditor(
		app,
		parent,
		groups,
		renderStepListEditor,
		onChange,
		{ addGroup: "Add group", namePlaceholder: "Group name (optional)" },
	);
}

export function renderNotesTextarea(parent: HTMLElement, value: string, onInput: (v: string) => void): void {
	const ta = parent.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--auto" });
	ta.value = value;
	ta.addEventListener("input", () => onInput(ta.value));
	autosizeTextarea(ta);
}

export type NutritionKey = "cal" | "prot" | "fat" | "carb";

export function renderNutritionFields(
	parent: HTMLElement,
	label: string,
	values: Record<NutritionKey, string>,
	onInput: (key: NutritionKey, value: string) => void,
): void {
	parent.createDiv({ cls: "rb-import-field-label", text: label });
	inlineRow(parent, [
		{ label: "Calories", placeholder: "350", value: values.cal, onInput: (v) => onInput("cal", v) },
		{ label: "Protein g", placeholder: "20", value: values.prot, onInput: (v) => onInput("prot", v) },
		{ label: "Fat g", placeholder: "12", value: values.fat, onInput: (v) => onInput("fat", v) },
		{ label: "Carbs g", placeholder: "40", value: values.carb, onInput: (v) => onInput("carb", v) },
	]);
}
