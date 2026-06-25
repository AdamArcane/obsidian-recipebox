/**
 * Merges ingredient contributions into the grocery list note and removes
 * them when a recipe is taken off the meal plan, writing changes back to the vault.
 */
import { App } from "obsidian";
import { ContributionMap } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { categorize } from "../category-match";
import { readNoteOrEmpty, writeNote } from "../../utils/vault-notes";
import { parseGroceryNoteText, GrocerySection } from "./parse";
import { renderGroceryLine, renderGrocerySections } from "./render";

export function mergeIntoGroceryText(noteText: string, contributions: ContributionMap, settings: RecipeBoxSettings): string {
	const sections = parseGroceryNoteText(noteText);
	const remaining = { ...contributions };

	for (const section of sections) {
		for (const line of section.lines) {
			if (line.kind !== "item") continue;
			const contrib = remaining[line.key];
			if (!contrib) continue;

			delete remaining[line.key];
			const newQty =
				line.quantity !== null && contrib.quantity !== null
					? line.quantity + contrib.quantity
					: line.quantity ?? contrib.quantity;

			line.quantity = newQty;
			line.raw = renderGroceryLine(line.name, line.unit, newQty, line.checked);
		}
	}

	for (const [key, contrib] of Object.entries(remaining)) {
		const category = categorize(contrib.name, undefined, settings.categoryOverrides, settings.categorySource);
		let section = sections.find((s) => s.category === category);
		if (!section) {
			section = { category, lines: [] } satisfies GrocerySection;
			sections.push(section);
		}
		const raw = renderGroceryLine(contrib.name, contrib.unit, contrib.quantity, false);
		section.lines.push({ kind: "item", key, name: contrib.name, unit: contrib.unit, quantity: contrib.quantity, checked: false, raw });
	}

	return renderGrocerySections(sections, settings);
}

export function removeFromGroceryText(noteText: string, contributions: ContributionMap, settings: RecipeBoxSettings): string {
	const sections = parseGroceryNoteText(noteText);

	for (const section of sections) {
		section.lines = section.lines.filter((line) => {
			if (line.kind !== "item") return true;
			const contrib = contributions[line.key];
			if (!contrib) return true;

			if (line.quantity === null || contrib.quantity === null) return false;
			const newQty = line.quantity - contrib.quantity;
			if (newQty <= 0) return false;

			line.quantity = newQty;
			line.raw = renderGroceryLine(line.name, line.unit, newQty, line.checked);
			return true;
		});
	}

	return renderGrocerySections(sections, settings);
}

export async function addToGroceryNote(app: App, contributions: ContributionMap, settings: RecipeBoxSettings): Promise<void> {
	if (Object.keys(contributions).length === 0) return;
	const text = await readNoteOrEmpty(app, settings.groceryListPath) || "# Grocery List\n";
	await writeNote(app, settings.groceryListPath, mergeIntoGroceryText(text, contributions, settings));
}

export async function removeFromGroceryNote(app: App, contributions: ContributionMap, settings: RecipeBoxSettings): Promise<void> {
	if (Object.keys(contributions).length === 0) return;
	const text = await readNoteOrEmpty(app, settings.groceryListPath);
	if (!text) return;
	await writeNote(app, settings.groceryListPath, removeFromGroceryText(text, contributions, settings));
}
