/**
 * Ingredient-specific glue for the generic entry list editor: qty / unit /
 * name / note fields, decomposed from and composed into the same line format
 * the vault's own ingredient parser (parser/ingredient-parse.ts) already
 * understands, so scaling, the grocery list, and the ingredient checklist all
 * keep working on recipes built through this form.
 */
import { ingredientParserOptions } from "../../parser/ingredient-parse";
import { decomposeIngredient, composeIngredient } from "./ingredient-entry-format";
import type { RecipeBoxSettings } from "../../settings/settings-types";
import { renderEntryListEditor, EntryField, EntryListHandle, EntryListOptions } from "./import-entry-list-editor";

const FIELDS: EntryField[] = [
	{ key: "qty", label: "Qty", placeholder: "1", cls: "rb-import-entry-cell--qty" },
	{ key: "unit", label: "Unit", placeholder: "cup", cls: "rb-import-entry-cell--unit" },
	{ key: "name", label: "Ingredient", placeholder: "flour", cls: "rb-import-entry-cell--name" },
	{ key: "note", label: "Note", placeholder: "optional", cls: "rb-import-entry-cell--note" },
];

function renderSummary(v: Record<string, string>, textEl: HTMLElement): void {
	textEl.createSpan({ text: [v.qty, v.unit, v.name].filter(Boolean).join(" ") });
	if (v.note) textEl.createSpan({ cls: "rb-import-entry-item-note", text: ` — ${v.note}` });
}

export function renderIngredientListEditor(
	parent: HTMLElement,
	initialItems: string[],
	onChange: (items: string[]) => void,
	settings: RecipeBoxSettings,
	listOptions?: EntryListOptions,
): EntryListHandle {
	const options = ingredientParserOptions(settings);
	return renderEntryListEditor(parent, FIELDS, initialItems, (line) => decomposeIngredient(line, options), composeIngredient, renderSummary, onChange, listOptions);
}
