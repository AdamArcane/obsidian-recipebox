/**
 * Renders the review and edit stage of the import modal into the provided
 * body and footer elements (supplied by BaseModal's shell).
 */
import { App } from "obsidian";
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

export function renderReviewStage(
	bodyEl: HTMLElement,
	footerEl: HTMLElement,
	app: App,
	settings: RecipeBoxSettings,
	initial: ExtractedRecipe,
	folder: string,
	warning: string | null,
	onBack: () => void,
): void {
	// Working copy — mutated by field inputs
	const recipe: ExtractedRecipe = { ...initial,
		ingredientGroups: [...initial.ingredientGroups],
		instructionGroups: [...initial.instructionGroups],
	};

	if (warning) {
		bodyEl.createDiv({ cls: "rb-import-warning-box", text: warning });
	}

	function field(label: string, value: string, multiline: false, onInput: (v: string) => void): void;
	function field(label: string, value: string, multiline: true, onInput: (v: string) => void, cls?: string): void;
	function field(label: string, value: string, multiline: boolean, onInput: (v: string) => void, cls?: string): void {
		const wrap = bodyEl.createDiv({ cls: "rb-import-field" });
		wrap.createDiv({ cls: "rb-import-field-label", text: label });
		if (multiline) {
			const ta = wrap.createEl("textarea", { cls: cls ?? "rb-import-textarea", attr: { rows: "4" } });
			ta.value = value;
			ta.addEventListener("input", () => onInput(ta.value));
		} else {
			const inp = wrap.createEl("input", { cls: "rb-import-text-input", attr: { type: "text" } });
			inp.value = value;
			inp.addEventListener("input", () => onInput(inp.value));
		}
	}

	field("Title", recipe.title, false, (v) => { recipe.title = v; });

	// Servings (leading-int extraction)
	const servWrap = bodyEl.createDiv({ cls: "rb-import-field" });
	servWrap.createDiv({ cls: "rb-import-field-label", text: "Servings" });
	const servInput = servWrap.createEl("input", {
		cls: "rb-import-text-input rb-import-text-input--short",
		attr: { type: "number", min: "1", placeholder: "4" },
	});
	servInput.value = leadingInt(recipe.servings);
	servInput.addEventListener("input", () => { recipe.servings = servInput.value || null; });

	// Timing row
	const timingValues = {
		prep: recipe.prepTime !== null ? String(recipe.prepTime) : "",
		cook: recipe.cookTime !== null ? String(recipe.cookTime) : "",
		total: recipe.totalTime !== null ? String(recipe.totalTime) : "",
	};
	bodyEl.createDiv({ cls: "rb-import-field-label", text: "Timing (minutes)" });
	inlineRow(bodyEl, [
		{ label: "Prep", placeholder: "15", value: timingValues.prep, onInput: (v) => { recipe.prepTime = parseNum(v); timingValues.prep = v; } },
		{ label: "Cook", placeholder: "30", value: timingValues.cook, onInput: (v) => { recipe.cookTime = parseNum(v); timingValues.cook = v; } },
		{ label: "Total", placeholder: "45", value: timingValues.total, onInput: (v) => { recipe.totalTime = parseNum(v); timingValues.total = v; } },
	]);

	field("Description", recipe.description, true, (v) => { recipe.description = v; });

	// Side-by-side ingredients / instructions
	const sideBySide = bodyEl.createDiv({ cls: "rb-import-side-by-side" });
	const ingWrap = sideBySide.createDiv({ cls: "rb-import-field rb-import-field--grow" });
	ingWrap.createDiv({ cls: "rb-import-field-label", text: "Ingredients" });
	const ingTa = ingWrap.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--tall", attr: { rows: "10" } });
	ingTa.value = groupsToTextarea(recipe.ingredientGroups);
	ingTa.addEventListener("input", () => { recipe.ingredientGroups = textareaToGroups(ingTa.value); });

	const instrWrap = sideBySide.createDiv({ cls: "rb-import-field rb-import-field--grow" });
	instrWrap.createDiv({ cls: "rb-import-field-label", text: "Instructions" });
	const instrTa = instrWrap.createEl("textarea", { cls: "rb-import-textarea rb-import-textarea--tall", attr: { rows: "10" } });
	instrTa.value = groupsToTextarea(recipe.instructionGroups);
	instrTa.addEventListener("input", () => { recipe.instructionGroups = textareaToGroups(instrTa.value); });

	// Nutrition row
	const nutValues = {
		cal: recipe.calories !== null ? String(recipe.calories) : "",
		prot: recipe.protein !== null ? String(recipe.protein) : "",
		fat: recipe.fat !== null ? String(recipe.fat) : "",
		carb: recipe.carbs !== null ? String(recipe.carbs) : "",
	};
	bodyEl.createDiv({ cls: "rb-import-field-label", text: "Nutrition (per serving)" });
	inlineRow(bodyEl, [
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
				(filePath) => { openInRecipeView(app, filePath); },
			);
		} finally {
			saveBtn.disabled = false;
			saveBtn.setText("Save recipe");
		}
	})(); });
}
