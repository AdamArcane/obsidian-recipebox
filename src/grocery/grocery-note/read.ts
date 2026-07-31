/**
 * Reads checked/unchecked state from the grocery list note and exposes helpers
 * for toggling individual items and bulk-resetting all checks.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { parseIngredientLine } from "../../parser/ingredient-parse";
import { unitsFromSettings } from "../../parser/unit-table";
import { ingredientKey } from "../../parser/ingredient-clean";
import { readNoteOrEmpty, writeNote, resolveNotePath } from "../../utils/vault-notes";
import { parseGroceryNoteText } from "./parse";
import { renderGroceryLine } from "./render";

export interface GroceryNoteItem {
	name: string;
	unit: string;
	quantity: number | null;
	checked: boolean;
	category: string;
}

export async function readGroceryNoteItems(app: App, settings: RecipeBoxSettings): Promise<Map<string, GroceryNoteItem>> {
	const text = await readNoteOrEmpty(app, resolveNotePath(settings.groceryListPath));
	if (!text) return new Map();

	const result = new Map<string, GroceryNoteItem>();
	for (const section of parseGroceryNoteText(text, unitsFromSettings(settings))) {
		for (const line of section.lines) {
			if (line.kind !== "item" || !line.key) continue;
			result.set(line.key, { name: line.name, unit: line.unit, quantity: line.quantity, checked: line.checked, category: section.category });
		}
	}
	return result;
}

export async function toggleGroceryNoteItemChecked(app: App, key: string, checked: boolean, settings: RecipeBoxSettings): Promise<void> {
	const path = resolveNotePath(settings.groceryListPath);
	const text = await readNoteOrEmpty(app, path);
	if (!text) return;

	const lines = text.split("\n");
	const units = unitsFromSettings(settings);
	let changed = false;

	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^- \[([x ])\] (.+)$/i);
		if (!m) continue;
		const parsed = parseIngredientLine(m[2], units);
		if (!parsed?.name) continue;
		if (ingredientKey(parsed.name, parsed.unit) !== key) continue;
		const updated = renderGroceryLine(parsed.name, parsed.unit, parsed.quantity, checked);
		lines[i] = updated;
		changed = true;
		break;
	}

	if (changed) await writeNote(app, path, lines.join("\n"));
}

export async function resetGroceryNoteChecks(app: App, settings: RecipeBoxSettings): Promise<void> {
	const path = resolveNotePath(settings.groceryListPath);
	const text = await readNoteOrEmpty(app, path);
	if (!text) return;
	await writeNote(app, path, text.replace(/^- \[x\]/gim, "- [ ]"));
}

/** Reads the grocery note once and rewrites all checkboxes to `checked` in a single write. */
export async function setAllGroceryNoteChecks(app: App, checked: boolean, settings: RecipeBoxSettings): Promise<void> {
	const path = resolveNotePath(settings.groceryListPath);
	const text = await readNoteOrEmpty(app, path);
	if (!text) return;
	const from = checked ? /^- \[ \]/gim : /^- \[x\]/gim;
	const to = checked ? "- [x]" : "- [ ]";
	await writeNote(app, path, text.replace(from, to));
}
