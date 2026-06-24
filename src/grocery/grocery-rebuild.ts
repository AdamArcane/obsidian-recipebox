import { App } from "obsidian";
import { GroceryItem, GroceryItemSource } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { readGroceryNoteItems } from "./grocery-note/read";

export async function rebuildGroceryItems(app: App, settings: RecipeBoxSettings): Promise<GroceryItem[]> {
	const noteItems = await readGroceryNoteItems(app, settings);

	// key → contributing recipe sources
	const recipeByKey = new Map<string, Array<{ recipeName: string; recipePath: string; quantity: number | null }>>();
	for (const entry of (settings.state.mealPlan ?? [])) {
		const file = app.vault.getFileByPath(entry.recipePath);
		const recipeName = file?.basename ?? entry.recipePath;
		for (const [key, contrib] of Object.entries(entry.contributions)) {
			if (!recipeByKey.has(key)) recipeByKey.set(key, []);
			recipeByKey.get(key)!.push({ recipeName, recipePath: entry.recipePath, quantity: contrib.quantity });
		}
	}

	// key → one-off item
	const oneOffByKey = new Map(
		(settings.state.oneOffItems ?? []).map((item) => {
			const key = `${item.name.toLowerCase().trim()}|${item.unit.toLowerCase()}`;
			return [key, item] as const;
		})
	);

	const items: GroceryItem[] = [];
	for (const [key, note] of noteItems) {
		const sources: GroceryItemSource[] = [];

		const recipeSources = recipeByKey.get(key);
		if (recipeSources) {
			for (const rs of recipeSources) {
				sources.push({ kind: "recipe", label: rs.recipeName, path: rs.recipePath, quantity: rs.quantity });
			}
		}

		const oneOff = oneOffByKey.get(key);
		if (oneOff) sources.push({ kind: "one-off", label: oneOff.name, quantity: oneOff.quantity });

		if (sources.length === 0) sources.push({ kind: "one-off", label: "added manually" });

		items.push({ key, name: note.name, unit: note.unit, quantity: note.quantity, category: note.category, sources, checked: note.checked });
	}

	return items;
}
