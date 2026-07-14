/**
 * Renders the review and edit stage of the import modal into the provided
 * body and footer elements (supplied by BaseModal's shell).
 */
import { App, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { groupsToTextarea, textareaToGroups } from "../../importer/recipe-group-textarea";
import { saveRecipe } from "./import-submit";
import { ConfirmModal } from "./confirm-modal";
import { openInRecipeView } from "../utils/open-in-recipe-view";

function leadingInt(s: string | null): string {
	if (!s) return "";
	const m = s.match(/^\d+/);
	return m ? m[0] : "";
}

function parseNum(s: string): number | null {
	const n = Number(s.trim());
	return s.trim() !== "" && isFinite(n) ? n : null;
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

// Reuses the same header/arrow/body structure and rb-extra-card* classes as
// the recipe view's trailing-section cards (section-extra-content.ts), rather
// than the settings tab's collapsible pattern -- that one is styled for
// dense settings lists (small chevron-text toggle), while this needs a
// full-bordered card that reads as a distinct block in a modal. Collapsing
// uses display:none (not the tab panels' visibility trick), so a collapsed
// section actually stops contributing height -- that's the point here, since
// the complaint was inner scrollbars/wasted space, not preserving layout
// height across a switch.
function importCard(parent: HTMLElement, title: string, expandedByDefault: boolean): HTMLElement {
	const card = parent.createDiv({ cls: "rb-extra-card" });
	if (!expandedByDefault) card.addClass("rb-extra-card--collapsed");
	const header = card.createDiv({ cls: "rb-extra-card-header" });
	const arrow = header.createDiv({ cls: "rb-extra-card-arrow" });
	setIcon(arrow, "chevron-down");
	header.createDiv({ cls: "rb-extra-card-title", text: title });
	const body = card.createDiv({ cls: "rb-extra-card-body" });
	header.addEventListener("click", () => {
		card.toggleClass("rb-extra-card--collapsed", !card.hasClass("rb-extra-card--collapsed"));
	});
	return body;
}

// Grows a textarea to fit its content instead of scrolling internally overflow stays hidden and
// resize is disabled via the rb-import-textarea--auto CSS class. A
// ResizeObserver (not a fixed rAF delay) drives the recalculation: a
// collapsed rb-extra-card sets its body to display:none, which makes any
// textarea inside it report scrollHeight 0 until the section is expanded, so
// a one-time measurement at render time can't work once cards start
// collapsed by default. The observer fires whenever the textarea's actual
// box size changes for any reason -- expand/collapse, mobile layout settling
// after the modal opens, orientation change -- so there's no timing to guess
// at. Also still recalculates on input, since typed content can grow the
// textarea without any external size change to trigger the observer.
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
	};

	if (warning) {
		bodyEl.createDiv({ cls: "rb-import-warning-box", text: warning });
	}

	// Best-effort preview of the source image at its original (pre-download) URL.
	// The actual vault download happens later in saveRecipe -- this is just a
	// visual check so the user can see what they're about to import. Silently
	// omitted if there's no heroImage or the URL fails to load, rather than
	// showing a broken-image icon.
	if (recipe.heroImage) {
		const imgWrap = bodyEl.createDiv({ cls: "rb-import-image-preview" });
		const img = imgWrap.createEl("img", { attr: { src: recipe.heroImage, alt: "" } });
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

	// Title stays outside every card -- it's the one field worth seeing no
	// matter which sections are expanded or collapsed.
	field(bodyEl, "Title", recipe.title, false, (v) => { recipe.title = v; });

	// Basic info: description, timing, servings. Expanded by default -- this is
	// the section most worth seeing right away.
	const basicBody = importCard(bodyEl, "Basic info", true);
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

	// Ingredients: its own card, stacked (not side-by-side with steps).
	const ingredientsBody = importCard(bodyEl, "Ingredients", false);
	const ingTa = ingredientsBody.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--auto" });
	ingTa.value = groupsToTextarea(recipe.ingredientGroups);
	ingTa.addEventListener("input", () => { recipe.ingredientGroups = textareaToGroups(ingTa.value); });
	autosizeTextarea(ingTa);

	// Steps: its own card.
	const stepsBody = importCard(bodyEl, "Steps", false);
	const instrTa = stepsBody.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--auto" });
	instrTa.value = groupsToTextarea(recipe.instructionGroups);
	instrTa.addEventListener("input", () => { recipe.instructionGroups = textareaToGroups(instrTa.value); });
	autosizeTextarea(instrTa);

	// Nutrition: its own card. Collapsed by default -- least essential field
	// set, and often blank on a fresh import, so it's the one worth hiding
	// to shorten the overall scroll unless the user wants to fill it in.
	const nutritionBody = importCard(bodyEl, "Nutrition", false);
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
