/**
 * Rebuilds the in-memory GroceryItem list from the grocery note and the
 * persisted per-key contribution history, with no inference step.
 */
import { App } from "obsidian";
import { GroceryContributionSource, GroceryItem, GroceryItemSource } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { readGroceryNoteItems } from "./grocery-note/read";

function toDisplaySource(app: App, source: GroceryContributionSource, quantity: number | null): GroceryItemSource {
	if (source.kind === "manual") {
		return { kind: "one-off", label: "added manually", quantity };
	}
	const file = app.vault.getFileByPath(source.path);
	const label = file?.basename ?? source.path.split("/").pop()?.replace(/\.md$/, "") ?? source.path;
	return { kind: "recipe", label, path: source.path, quantity, day: source.day, mealType: source.mealType };
}

export async function rebuildGroceryItems(app: App, settings: RecipeBoxSettings): Promise<GroceryItem[]> {
	const noteItems = await readGroceryNoteItems(app, settings);
	const history = settings.state.groceryContributions ?? {};

	const items: GroceryItem[] = [];
	for (const [key, note] of noteItems) {
		const records = history[key] ?? [];
		const sources: GroceryItemSource[] = records.map(r => toDisplaySource(app, r.source, r.quantity));
		if (sources.length === 0) sources.push({ kind: "one-off", label: "added manually" });
		items.push({ key, name: note.name, unit: note.unit, quantity: note.quantity, category: note.category, sources, checked: note.checked });
	}

	return items;
}
