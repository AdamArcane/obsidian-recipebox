/**
 * Stateless action functions for adding, removing, and rescheduling meal plan
 * entries — each function updates settings state, saves, and writes to the notes.
 */
import { App, Notice } from "obsidian";
import { ContributionMap, MealPlanEntry } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { generateEntryId, localDateISO } from "../utils/date";
import { addToGroceryNote, removeFromGroceryNote } from "./grocery-note/write";
import { insertMealPlanEntry, removeMealPlanEntry } from "./meal-plan-note/write";

function resolveRecipeName(app: App, filePath: string): string {
	return app.vault.getFileByPath(filePath)?.basename ?? filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
}

export async function addToMealPlan(
	app: App,
	recipePath: string,
	day: string | undefined,
	mealType: string | undefined,
	contributions: ContributionMap,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	if (!recipePath.trim()) return;

	// Replace any existing entry for this recipe (recipe-view modal flow: re-schedule replaces)
	const existingIdx = settings.state.mealPlan.findIndex((e) => e.recipePath === recipePath);
	if (existingIdx >= 0) {
		const old = settings.state.mealPlan[existingIdx];
		if (Object.keys(old.contributions).length > 0) {
			await removeFromGroceryNote(app, old.contributions, settings);
		}
		settings.state.mealPlan.splice(existingIdx, 1);
	}

	const entry: MealPlanEntry = {
		id: generateEntryId(),
		recipePath: recipePath.trim(),
		day: day?.trim() || undefined,
		meal: mealType?.trim() || undefined,
		addedDate: localDateISO(),
		contributions,
		autoAddProcessed: Object.keys(contributions).length > 0,
	};

	settings.state.mealPlan.push(entry);
	await save();

	await insertMealPlanEntry(app, entry, settings);
	if (Object.keys(contributions).length > 0) {
		await addToGroceryNote(app, contributions, settings);
	}

	const name = resolveRecipeName(app, recipePath);
	const dayMeal = [entry.day, entry.meal].filter(Boolean).join(", ");
	new Notice(dayMeal ? `${name} added to meal plan (${dayMeal})` : `${name} added to meal plan`);
}

/** Creates a new independent entry without replacing any existing entry for the same recipe. Used by drag-drop in the meal plan view. Returns the new entry ID. */
export async function addMealPlanEntry(
	app: App,
	recipePath: string,
	day: string | undefined,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<string> {
	if (!recipePath.trim()) return "";

	const entry: MealPlanEntry = {
		id: generateEntryId(),
		recipePath: recipePath.trim(),
		day: day?.trim() || undefined,
		addedDate: localDateISO(),
		contributions: {},
	};

	settings.state.mealPlan.push(entry);
	await save();
	await insertMealPlanEntry(app, entry, settings);

	const name = resolveRecipeName(app, recipePath);
	const dayLabel = entry.day ? ` (${entry.day})` : "";
	new Notice(`${name} added to meal plan${dayLabel}`);
	return entry.id;
}

/** Updates just the meal type of an existing entry and rewrites its note line. */
export async function setMealPlanEntryMealType(
	app: App,
	id: string,
	mealType: string | undefined,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.mealPlan.findIndex(e => e.id === id);
	if (idx < 0) return;

	const entry = settings.state.mealPlan[idx];
	// Rewrite the note line: remove old, insert updated
	await removeMealPlanEntry(app, entry.recipePath, settings, entry.day);
	settings.state.mealPlan[idx] = { ...entry, meal: mealType?.trim() || undefined };
	await save();
	await insertMealPlanEntry(app, settings.state.mealPlan[idx], settings);
}

/** Creates a leftovers planning marker — no recipe, no grocery contribution, state-only. Returns the new entry ID. */
export async function addLeftoversEntry(
	day: string | undefined,
	label: string,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<string> {
	const entry: MealPlanEntry = {
		id: generateEntryId(),
		recipePath: "",
		label: label.trim() || "Leftovers",
		day: day?.trim() || undefined,
		addedDate: localDateISO(),
		contributions: {},
	};
	settings.state.mealPlan.push(entry);
	await save();
	return entry.id;
}

export async function addToGroceryOnly(
	app: App,
	contributions: ContributionMap,
	settings: RecipeBoxSettings,
	silent = false,
): Promise<void> {
	if (Object.keys(contributions).length === 0) return;
	await addToGroceryNote(app, contributions, settings);
	if (!silent) {
		const n = Object.keys(contributions).length;
		new Notice(`${n} item${n === 1 ? "" : "s"} added to grocery list.`);
	}
}

export async function rescheduleMealPlanEntry(
	app: App,
	id: string,
	newDay: string | undefined,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.mealPlan.findIndex(e => e.id === id);
	if (idx < 0) return;

	const entry = settings.state.mealPlan[idx];
	// Remove from old day section in note (pass old day so we target the right section when duplicates exist)
	await removeMealPlanEntry(app, entry.recipePath, settings, entry.day);

	// Update day in state
	settings.state.mealPlan[idx] = { ...entry, day: newDay };
	await save();

	// Re-insert at new section
	await insertMealPlanEntry(app, settings.state.mealPlan[idx], settings);
}

async function reverseContributions(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings): Promise<void> {
	await removeMealPlanEntry(app, entry.recipePath, settings, entry.day);
	if (Object.keys(entry.contributions).length > 0) {
		await removeFromGroceryNote(app, entry.contributions, settings);
	}
}

export async function removeFromMealPlan(
	app: App,
	id: string,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.mealPlan.findIndex((e) => e.id === id);
	if (idx < 0) return;

	const entry = settings.state.mealPlan[idx];
	settings.state.mealPlan.splice(idx, 1);
	await save();

	await reverseContributions(app, entry, settings);

	const name = entry.label ?? resolveRecipeName(app, entry.recipePath);
	new Notice(`${name} removed from meal plan.`);
}

export async function clearMealPlan(
	app: App,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<number> {
	const entries = [...settings.state.mealPlan];
	const count = entries.length;

	for (const entry of entries) {
		await reverseContributions(app, entry, settings);
	}

	settings.state.mealPlan = [];
	await save();
	return count;
}
