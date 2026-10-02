/**
 * Edit-mode composition of the shared Add Recipe section builders. Unlike
 * create mode there is no draft recipe: the form keeps the loaded values next
 * to the working values and, at save, emits only what differs. Untouched
 * fields and sections are never written, so the lossy parts of the form
 * (number parsing, list marker normalization) cannot damage content the user
 * did not edit.
 */
import { App, setIcon } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ImportedGroup } from "../../importer/recipe-extract-types";
import { titleToFilename } from "../../importer/note-filename";
import { EditableRecipe, LoadedSection } from "../../recipe-edit/load-recipe-for-edit";
import { groupsEqual } from "../../recipe-edit/section-render";
import { SectionEdit } from "../../recipe-edit/apply-section-edits";
import { FrontmatterEdits } from "../../recipe-edit/apply-frontmatter-edits";
import { SaveRequest } from "../../recipe-edit/save-recipe-edits";
import { NUTRITION_FIELDS } from "../recipe-view/nutrition-fields";
import {
	importSection, textField, titleImageRow, renderImageField, renderImagePreview,
	renderTimingFields, renderIngredientsEditor, renderStepsEditor, renderNotesTextarea,
	renderNutritionFields, NutritionKey,
} from "./add-recipe-form-sections";

export type EditSectionTarget = "ingredients" | "instructions";

export type BuildResult =
	| { kind: "invalid"; message: string }
	/** request is null when nothing changed. */
	| { kind: "ok"; request: SaveRequest | null };

export interface EditFormController {
	buildRequest(): BuildResult;
	showError(message: string | null): void;
}

export interface EditFormOptions {
	app: App;
	settings: RecipeBoxSettings;
	basename: string;
	loaded: EditableRecipe;
	focusSection?: EditSectionTarget;
	onOpenMarkdown: () => void;
}

// Lookup between the builder's short nutrition keys and the settings keys
// the loader and applyNutritionEdits use.
const NUTRITION_KEYS: Array<[NutritionKey, string]> = [
	["cal", "caloriesProperty"],
	["prot", "proteinProperty"],
	["fat", "fatProperty"],
	["carb", "carbsProperty"],
];

const trimEdgeNewlines = (s: string): string => s.replace(/^\n+|\n+$/g, "");

export function renderEditRecipeForm(bodyEl: HTMLElement, opts: EditFormOptions): EditFormController {
	const { app, settings, loaded, basename } = opts;

	const errorEl = bodyEl.createDiv({ cls: "rb-import-warning-box" });
	errorEl.hide();

	// Working values. Start equal to the loaded ones; compared at save.
	let titleValue = basename;
	let renameChecked = false;
	let image: string | null = loaded.image.value || null;
	const timing = { prep: loaded.prepTime, cook: loaded.cookTime, total: loaded.totalTime, servings: loaded.servings };
	let ingredientGroups: ImportedGroup[] = loaded.ingredients.groups;
	let stepGroups: ImportedGroup[] = loaded.steps.groups;
	let notesText = loaded.notes.text;
	const nutrition: Record<string, string> = { ...loaded.nutrition };

	// Title: the recipe title IS the filename, so it is only editable when the
	// user opts into renaming.
	const { left, preview } = titleImageRow(bodyEl);
	const titleInput = textField(left, "Title", titleValue, (v) => { titleValue = v; });
	titleInput.readOnly = true;
	const renameRow = left.createEl("label", { cls: "rb-edit-rename-row" });
	const renameBox = renameRow.createEl("input", { attr: { type: "checkbox" } });
	renameRow.createSpan({ text: "Rename file" });
	renameBox.addEventListener("change", () => {
		renameChecked = renameBox.checked;
		titleInput.readOnly = !renameChecked;
		// Unchecking discards the typed title so it can never be applied by accident.
		if (!renameChecked) { titleValue = basename; titleInput.value = basename; }
		else titleInput.focus();
	});

	if (loaded.image.editable) {
		renderImageField(app, left, preview, image, (img) => { image = img; });
	} else {
		// A body embed is the hero image; also writing a frontmatter image would
		// leave two competing sources.
		const field = left.createDiv({ cls: "rb-import-field" });
		field.createDiv({ cls: "rb-import-field-label", text: "Image" });
		const input = field.createEl("input", { cls: "rb-import-text-input", attr: { type: "text" } });
		input.value = loaded.image.value;
		input.readOnly = true;
		field.createDiv({ cls: "rb-modal-desc", text: "Image comes from the note body; edit it as markdown." });
		renderImagePreview(app, preview, loaded.image.value);
	}

	const basicBody = importSection(bodyEl, "Basic info");
	renderTimingFields(basicBody, timing, (key, v) => { timing[key] = v; }, "text");

	function listSection(
		title: string,
		section: LoadedSection,
		renderEditor: (body: HTMLElement) => void,
	): HTMLElement {
		const body = importSection(bodyEl, title);
		if (section.status === "ineligible") {
			body.createDiv({
				cls: "rb-modal-desc",
				text: "This section has content the editor can't change safely (paragraphs, nested lists, multi-line steps, etc.).",
			});
			const btn = body.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
			setIcon(btn.createSpan({ cls: "rb-modal-btn-icon" }), "pencil");
			btn.createSpan({ text: "Open as Markdown" });
			btn.addEventListener("click", opts.onOpenMarkdown);
		} else {
			renderEditor(body);
		}
		return body;
	}

	const ingredientsBody = listSection("Ingredients", loaded.ingredients, (body) =>
		renderIngredientsEditor(app, body, ingredientGroups, settings, (g) => { ingredientGroups = g; }));
	const stepsBody = listSection("Steps", loaded.steps, (body) =>
		renderStepsEditor(app, body, stepGroups, (g) => { stepGroups = g; }));

	// Raw markdown, written back verbatim -- not the list-marker-stripping
	// textarea conversion Add Recipe uses.
	renderNotesTextarea(importSection(bodyEl, "Notes"), notesText, (v) => { notesText = v; });

	const nutritionBody = importSection(bodyEl, "Nutrition");
	const basis = settings.nutritionSource === "per-serving" ? "per serving" : "recipe total";
	nutritionBody.createDiv({ cls: "rb-modal-desc", text: `Values are stored as ${basis}, unscaled by the current multiplier.` });
	renderNutritionFields(
		nutritionBody,
		"Nutrition",
		{
			cal: nutrition.caloriesProperty, prot: nutrition.proteinProperty,
			fat: nutrition.fatProperty, carb: nutrition.carbsProperty,
		},
		(key, v) => {
			const entry = NUTRITION_KEYS.find(([k]) => k === key);
			if (entry) nutrition[entry[1]] = v;
		},
	);

	if (opts.focusSection) {
		const target = opts.focusSection === "ingredients" ? ingredientsBody : stepsBody;
		// After layout: the modal body has no height until the browser has laid it out.
		window.requestAnimationFrame(() => {
			target.scrollIntoView({ block: "start" });
			target.querySelector<HTMLElement>("input, button")?.focus();
		});
	}

	function sectionEdit(
		kind: "ingredients" | "steps",
		section: LoadedSection,
		heading: string,
		groups: ImportedGroup[],
	): SectionEdit | null {
		if (section.status === "ineligible" || groupsEqual(groups, section.groups)) return null;
		return { kind, heading, snapshot: section.snapshot, groups, style: section.style };
	}

	return {
		showError(message) {
			if (message === null) { errorEl.hide(); return; }
			errorEl.setText(message);
			errorEl.show();
			errorEl.scrollIntoView({ block: "nearest" });
		},

		buildRequest() {
			let renameTo: string | null = null;
			if (renameChecked) {
				const trimmed = titleValue.trim();
				if (!trimmed) return { kind: "invalid", message: "Title can't be empty." };
				const collapsed = trimmed.replace(/\s+/g, " ");
				if (titleToFilename(trimmed) !== collapsed) {
					return { kind: "invalid", message: "Title can't contain any of these characters: \\ / : * ? \" < > | # [ ]" };
				}
				if (collapsed !== basename) renameTo = collapsed;
			}

			const sections: SectionEdit[] = [];
			const ing = sectionEdit("ingredients", loaded.ingredients, settings.ingredientsHeading, ingredientGroups);
			if (ing) sections.push(ing);
			const steps = sectionEdit("steps", loaded.steps, settings.instructionsHeading, stepGroups);
			if (steps) sections.push(steps);

			const notesDirty = trimEdgeNewlines(notesText) !== trimEdgeNewlines(loaded.notes.text);
			if (notesDirty) {
				sections.push({
					kind: "notes",
					heading: settings.notesHeading,
					snapshot: loaded.notes.snapshot,
					style: loaded.steps.style,
					notesText,
				});
			}

			const fm: FrontmatterEdits = {};
			if (loaded.image.editable && (image ?? "") !== loaded.image.value) fm.image = image ?? "";
			if (timing.prep !== loaded.prepTime) fm.prepTime = timing.prep;
			if (timing.cook !== loaded.cookTime) fm.cookTime = timing.cook;
			if (timing.total !== loaded.totalTime) fm.totalTime = timing.total;
			if (timing.servings !== loaded.servings) fm.servings = timing.servings;
			if (NUTRITION_FIELDS.some((f) => (nutrition[f.settingsKey] ?? "") !== (loaded.nutrition[f.settingsKey] ?? ""))) {
				fm.nutrition = { ...nutrition };
			}

			const nothing = sections.length === 0 && renameTo === null && Object.keys(fm).length === 0;
			return { kind: "ok", request: nothing ? null : { sections, frontmatter: fm, renameTo } };
		},
	};
}
