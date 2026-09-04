/**
 * Ingredient-specific glue for the generic entry list editor: qty / unit /
 * name / note fields, decomposed from and composed into the same line format
 * the vault's own ingredient parser (parser/ingredient-parse.ts) already
 * understands, so scaling, the grocery list, and the ingredient checklist all
 * keep working on recipes built through this form.
 */
import { parseLeadingQuantity } from "../../parser/quantity-parse";
import { consumeUnit } from "../../parser/ingredient-parse";
import { stripListMarkers, extractInlineNotes, stripOf } from "../../parser/ingredient-clean";
import { renderEntryListEditor, EntryField } from "./import-entry-list-editor";

const FIELDS: EntryField[] = [
	{ key: "qty", label: "Qty", placeholder: "1", cls: "rb-import-entry-cell--qty" },
	{ key: "unit", label: "Unit", placeholder: "cup", cls: "rb-import-entry-cell--unit" },
	{ key: "name", label: "Ingredient", placeholder: "flour", cls: "rb-import-entry-cell--name" },
	{ key: "note", label: "Note", placeholder: "optional", cls: "rb-import-entry-cell--note" },
];

// Mirrors parseIngredientLine's pipeline but skips its final normaliseName
// step -- that lowercases the name for grocery-list matching, which is
// correct there but wrong here: re-clicking a list row to edit it would
// otherwise silently lowercase whatever casing the user originally typed.
function decompose(line: string): Record<string, string> {
	let text = stripListMarkers(line);
	const { cleaned: afterNotes, note } = extractInlineNotes(text);
	text = afterNotes;
	const { quantity, rest: afterQty } = parseLeadingQuantity(text);
	text = stripOf(afterQty);
	const { unit, remaining: afterUnit } = consumeUnit(text);
	text = stripOf(afterUnit).replace(/[,;:.]+$/, "").trim();
	return { qty: quantity !== null ? String(quantity) : "", unit, name: text, note: note ?? "" };
}

function compose(v: Record<string, string>): string {
	const name = v.name.trim();
	if (!name) return "";
	const parts = [v.qty.trim(), v.unit.trim(), name].filter(Boolean);
	let line = parts.join(" ");
	if (v.note.trim()) line += ` (${v.note.trim()})`;
	return line;
}

function renderSummary(v: Record<string, string>, textEl: HTMLElement): void {
	textEl.createSpan({ text: [v.qty, v.unit, v.name].filter(Boolean).join(" ") });
	if (v.note) textEl.createSpan({ cls: "rb-import-entry-item-note", text: ` — ${v.note}` });
}

export function renderIngredientListEditor(
	parent: HTMLElement,
	initialItems: string[],
	onChange: (items: string[]) => void,
): void {
	renderEntryListEditor(parent, FIELDS, initialItems, decompose, compose, renderSummary, onChange);
}
