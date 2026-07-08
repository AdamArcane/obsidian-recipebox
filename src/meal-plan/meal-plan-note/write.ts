/**
 * Persists individual meal plan entry changes to the meal plan note —
 * inserting new lines and removing existing ones by wikilink and day section.
 */
import { App } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { readNoteOrEmpty, writeNote, resolveNotePath } from "../../utils/vault-notes";
import { parseMealPlanNote } from "./parse";
import { insertMealPlanEntryIntoText } from "./render";

function resolveRecipeName(app: App, filePath: string): string {
	return app.vault.getFileByPath(filePath)?.basename ?? filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
}

export async function insertMealPlanEntry(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings): Promise<void> {
	const name = entry.recipePath ? resolveRecipeName(app, entry.recipePath) : (entry.label ?? "");
	const path = resolveNotePath(settings.mealPlanPath);

	// The path template (e.g. "Meal Plans/{YYYY}/Week {ww}.md") rolls over to a
	// new note on a date boundary. A missing note at the resolved path is the
	// rollover signal: drop stale entries from the previous period, keeping
	// only the entry being written here (callers already push it into
	// state.mealPlan before calling this function, so a plain [] would drop it too).
	if (!app.vault.getFileByPath(path)) {
		settings.state.mealPlan = settings.state.mealPlan.filter((e) => e.id === entry.id);
	}

	const text = await readNoteOrEmpty(app, path) || "# Meal Plan\n";
	await writeNote(app, path, insertMealPlanEntryIntoText(text, entry, name, settings));
}

export async function removeMealPlanEntry(
	app: App,
	entry: MealPlanEntry,
	settings: RecipeBoxSettings,
): Promise<void> {
	const path = resolveNotePath(settings.mealPlanPath);
	const text = await readNoteOrEmpty(app, path);
	if (!text) return;

	const sections = parseMealPlanNote(text, settings.mealTypeFieldName);
	const sectionTarget = entry.day?.trim() || "Meal Plan Queue";
	let removed = false;

	// Match by wikilink for recipe entries, by label text for custom meal entries
	const isMatch = entry.recipePath
		? (wikilink: string) => wikilink.toLowerCase() === resolveRecipeName(app, entry.recipePath).toLowerCase()
		: (wikilink: string, label?: string) => !wikilink && (label ?? "").toLowerCase() === (entry.label ?? "").toLowerCase();

	for (const section of sections) {
		const sectionLabel = section.header ?? "Meal Plan Queue";
		const isTarget = !entry.day || sectionLabel.toLowerCase() === sectionTarget.toLowerCase();
		if (isTarget) {
			section.lines = section.lines.filter(
				(l) => removed || l.kind !== "entry" || !isMatch(l.wikilink, l.label)
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
	await writeNote(app, path, lines.join("\n").trimEnd());
}
