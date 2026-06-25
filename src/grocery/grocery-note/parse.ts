/**
 * Parses the raw text of the grocery list note into typed sections and line
 * objects, distinguishing recognised ingredient checkboxes from opaque lines.
 */
import { parseIngredientLine } from "../../parser/ingredient-parse";
import { ingredientKey } from "../../parser/ingredient-clean";

export interface GroceryLine {
	kind: "item" | "opaque";
	key: string;
	name: string;
	unit: string;
	quantity: number | null;
	checked: boolean;
	raw: string;
}

export interface GrocerySection {
	category: string;
	lines: GroceryLine[];
}

const CHECKBOX_RE = /^- \[([x ])\] (.+)$/i;

export function parseGroceryNoteText(text: string): GrocerySection[] {
	const sections: GrocerySection[] = [];
	let current: GrocerySection | null = null;

	for (const raw of text.split("\n")) {
		if (raw.startsWith("## ")) {
			if (current) sections.push(current);
			current = { category: raw.slice(3).trim(), lines: [] };
			continue;
		}
		if (!current) continue;

		const m = raw.match(CHECKBOX_RE);
		if (!m) {
			current.lines.push({ kind: "opaque", key: "", name: "", unit: "", quantity: null, checked: false, raw });
			continue;
		}

		const checked = m[1].toLowerCase() === "x";
		const parsed = parseIngredientLine(m[2]);
		if (!parsed?.name) {
			current.lines.push({ kind: "opaque", key: "", name: "", unit: "", quantity: null, checked, raw });
			continue;
		}

		const key = ingredientKey(parsed.name, parsed.unit);
		current.lines.push({ kind: "item", key, name: parsed.name, unit: parsed.unit, quantity: parsed.quantity, checked, raw });
	}

	if (current) sections.push(current);
	return sections;
}
