/**
 * Stateless action functions for adding, removing, and rescheduling meal plan
 * entries — each function updates settings state, saves, and writes to the notes.
 */
import { App, Notice } from "obsidian";
import { ContributionMap, GroceryContributionSource, MealPlanEntry } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { generateEntryId, localDateISO } from "../utils/date";
import { addToGroceryNote, removeFromGroceryNote } from "../grocery/grocery-note/write";
import { insertMealPlanEntry, removeMealPlanEntry } from "./meal-plan-note/write";
import { recordContributions, unrecordContributions, severScheduleLinks } from "../grocery/contribution-history";

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
	save: () => Promise<void>,
	isLeftovers = false,
): Promise<void> {
	if (!recipePath.trim()) return;

	// Replace any existing entry for this recipe (recipe-view modal flow: re-schedule replaces)
	const existingIdx = settings.state.mealPlan.findIndex((e) => e.recipePath === recipePath);
	if (existingIdx >= 0) {
		const old = settings.state.mealPlan[existingIdx];
		if (Object.keys(old.contributions).length > 0) {
			await removeFromGroceryNote(app, old.contributions, settings);
			unrecordContributions(old.contributions, { kind: "recipe", path: old.recipePath, day: old.day, mealType: old.meal }, settings);
		}
		settings.state.mealPlan.splice(existingIdx, 1);
	}

	const entry: MealPlanEntry = {
		id: generateEntryId(),
		recipePath: recipePath.trim(),
		day: day?.trim() || undefined,
		meal: mealType?.trim() || undefined,
		isLeftovers: isLeftovers || undefined,
		addedDate: localDateISO(),
		contributions,
		autoAddProcessed: Object.keys(contributions).length > 0,
	};

	if (Object.keys(contributions).length > 0) {
		const source: GroceryContributionSource = { kind: "recipe", path: recipePath.trim(), day: day?.trim() || undefined, mealType: mealType?.trim() || undefined };
		recordContributions(contributions, source, settings);
	}

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
	await removeMealPlanEntry(app, entry, settings);
	settings.state.mealPlan[idx] = { ...entry, meal: mealType?.trim() || undefined };
	await save();
	await insertMealPlanEntry(app, settings.state.mealPlan[idx], settings);
}

/** Creates a custom meal entry (no recipe note). `isLeftovers` flags it as a leftovers marker. Returns the new entry ID. */
export async function addCustomMealEntry(
	app: App,
	label: string,
	day: string | undefined,
	meal: string | undefined,
	isLeftovers: boolean,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<string> {
	const entry: MealPlanEntry = {
		id: generateEntryId(),
		recipePath: "",
		label: label.trim() || "Custom meal",
		day: day?.trim() || undefined,
		meal: meal?.trim() || undefined,
		isLeftovers: isLeftovers || undefined,
		addedDate: localDateISO(),
		contributions: {},
	};
	settings.state.mealPlan.push(entry);
	await save();
	await insertMealPlanEntry(app, entry, settings);
	return entry.id;
}

/** Edits an existing custom meal entry: updates state and rewrites the note line. */
export async function editCustomMealEntry(
	app: App,
	id: string,
	updates: { day?: string; meal?: string; label?: string; isLeftovers?: boolean },
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	const idx = settings.state.mealPlan.findIndex(e => e.id === id);
	if (idx < 0) return;
	const entry = settings.state.mealPlan[idx];
	await removeMealPlanEntry(app, entry, settings);
	const updated: MealPlanEntry = {
		...entry,
		label: updates.label?.trim() ?? entry.label,
		day: updates.day ?? entry.day,
		meal: updates.meal ?? entry.meal,
		isLeftovers: updates.isLeftovers ?? entry.isLeftovers,
	};
	settings.state.mealPlan[idx] = updated;
	await save();
	await insertMealPlanEntry(app, updated, settings);
}

export async function addToGroceryOnly(
	app: App,
	contributions: ContributionMap,
	source: GroceryContributionSource,
	settings: RecipeBoxSettings,
	silent = false,
): Promise<void> {
	if (Object.keys(contributions).length === 0) return;
	recordContributions(contributions, source, settings);
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
	await removeMealPlanEntry(app, entry, settings);

	// Update day in state
	settings.state.mealPlan[idx] = { ...entry, day: newDay };
	await save();

	// Re-insert at new section
	await insertMealPlanEntry(app, settings.state.mealPlan[idx], settings);
}

async function reverseContributions(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings): Promise<void> {
	await removeMealPlanEntry(app, entry, settings);
	if (Object.keys(entry.contributions).length > 0) {
		unrecordContributions(entry.contributions, { kind: "recipe", path: entry.recipePath, day: entry.day, mealType: entry.meal }, settings);
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
	alsoRemoveFromGrocery: boolean,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<number> {
	const entries = [...settings.state.mealPlan];
	const count = entries.length;

	if (alsoRemoveFromGrocery) {
		for (const entry of entries) {
			await reverseContributions(app, entry, settings);
		}
	} else {
		// Keep grocery quantities intact — only sever the schedule link so items
		// are no longer attributed to a day that no longer exists in the plan.
		for (const entry of entries) {
			if (entry.recipePath) severScheduleLinks(entry.recipePath, settings);
		}
	}

	settings.state.mealPlan = [];
	await save();
	return count;
}
