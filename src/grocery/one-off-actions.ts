import { App, Notice } from "obsidian";
import { ContributionMap, OneOffItem } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { ingredientKey } from "../parser/ingredient-clean";
import { parseIngredientLine } from "../parser/ingredient-parse";
import { toTitleCase } from "../utils/text-case";
import { addToGroceryNote, removeFromGroceryNote } from "./grocery-note/write";

function generateOneOffId(): string {
	return `oneoff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseFreeformOneOff(raw: string): { name: string; quantity: number | null; unit: string } | null {
	if (!raw.trim()) return null;
	const parsed = parseIngredientLine(raw);
	if (!parsed?.name) return null;
	return { name: parsed.name, quantity: parsed.quantity, unit: parsed.unit };
}

export async function addOneOff(
	app: App,
	rawItem: Omit<OneOffItem, "id">,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<OneOffItem | null> {
	if (!rawItem.name.trim()) return null;

	const item: OneOffItem = { ...rawItem, id: generateOneOffId(), name: rawItem.name.trim(), unit: rawItem.unit.trim() };
	settings.state.oneOffItems.push(item);
	await save();

	const key = ingredientKey(item.name, item.unit);
	await addToGroceryNote(app, { [key]: { name: item.name, unit: item.unit, quantity: item.quantity } }, settings);
	new Notice(toTitleCase(item.name) + " added to grocery list.");
	return item;
}

export async function updateOneOff(
	app: App,
	id: string,
	updates: Partial<Omit<OneOffItem, "id">>,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.oneOffItems.findIndex((i) => i.id === id);
	if (idx < 0) return;

	const old = settings.state.oneOffItems[idx];
	const oldKey = ingredientKey(old.name, old.unit);
	const oldContrib: ContributionMap = { [oldKey]: { name: old.name, unit: old.unit, quantity: old.quantity } };

	if (updates.name !== undefined) {
		const trimmed = updates.name.trim();
		if (!trimmed) return;
		old.name = trimmed;
	}
	if (updates.quantity !== undefined) old.quantity = updates.quantity;
	if (updates.unit !== undefined) old.unit = updates.unit.trim();
	if (updates.categoryOverride !== undefined) old.categoryOverride = updates.categoryOverride;

	await save();

	await removeFromGroceryNote(app, oldContrib, settings);
	const newKey = ingredientKey(old.name, old.unit);
	await addToGroceryNote(app, { [newKey]: { name: old.name, unit: old.unit, quantity: old.quantity } }, settings);
}

export async function removeOneOff(
	app: App,
	id: string,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.oneOffItems.findIndex((i) => i.id === id);
	if (idx < 0) return;

	const item = settings.state.oneOffItems[idx];
	settings.state.oneOffItems.splice(idx, 1);
	await save();

	const key = ingredientKey(item.name, item.unit);
	await removeFromGroceryNote(app, { [key]: { name: item.name, unit: item.unit, quantity: item.quantity } }, settings);
}

export async function removeFromGroceryByKey(
	app: App,
	key: string,
	items: { key: string; name: string; unit: string; quantity: number | null }[],
	settings: RecipeBoxSettings,
	silent = false,
): Promise<void> {
	const item = items.find((i) => i.key === key);
	if (!item) return;
	// Removing from the note only — does not clean up meal plan contributions or one-off records
	// intentionally: removing from the shopping list shouldn't silently un-plan a meal.
	await removeFromGroceryNote(app, { [key]: { name: item.name, unit: item.unit, quantity: item.quantity } }, settings);
	if (!silent) new Notice(toTitleCase(item.name) + " removed from grocery list.");
}
