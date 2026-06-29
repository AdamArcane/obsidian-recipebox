/**
 * Persists individual meal plan entry changes to the meal plan note —
 * inserting new lines and removing existing ones by wikilink and day section.
 */
import { App } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { readNoteOrEmpty, writeNote } from "../../utils/vault-notes";
import { parseMealPlanNote } from "./parse";
import { insertMealPlanEntryIntoText } from "./render";

function resolveRecipeName(app: App, filePath: string): string {
	return app.vault.getFileByPath(filePath)?.basename ?? filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
}

export async function insertMealPlanEntry(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings): Promise<void> {
	const name = resolveRecipeName(app, entry.recipePath);
	const text = await readNoteOrEmpty(app, settings.mealPlanPath) || "# Meal Plan\n";
	await writeNote(app, settings.mealPlanPath, insertMealPlanEntryIntoText(text, entry, name, settings));
}

export async function removeMealPlanEntry(
	app: App,
	recipePath: string,
	settings: RecipeBoxSettings,
	targetDay?: string,
): Promise<void> {
	if (!recipePath) return; // leftovers entries are state-only, not in the note
	const text = await readNoteOrEmpty(app, settings.mealPlanPath);
	if (!text) return;

	const name = resolveRecipeName(app, recipePath).toLowerCase();
	const sections = parseMealPlanNote(text, settings.mealTypeFieldName);
	const sectionTarget = targetDay?.trim() || "Meal Plan Queue";
	let removed = false;

	for (const section of sections) {
		const sectionLabel = section.header ?? "Meal Plan Queue";
		const isTarget = !targetDay || sectionLabel.toLowerCase() === sectionTarget.toLowerCase();
		if (isTarget) {
			section.lines = section.lines.filter(
				(l) => removed || l.kind !== "entry" || l.wikilink.toLowerCase() !== name
					? true
					: (removed = true, false) // remove first match only in the target section
			);
		}
	}

	const lines: string[] = [];
	for (const section of sections) {
		if (section.header) lines.push(`## ${section.header}`);
		for (const l of section.lines) lines.push(l.raw);
	}
	await writeNote(app, settings.mealPlanPath, lines.join("\n").trimEnd());
}
