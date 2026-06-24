import { MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { slugifyMealType } from "../../utils/text-case";
import { MealPlanSection } from "./parse";

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function isQueueLabel(day: string): boolean {
	const l = day.trim().toLowerCase();
	return l === "queue" || l === "meal plan queue" || l === "unscheduled";
}

export function dayRank(day: string | undefined): number {
	if (!day || isQueueLabel(day)) return 0;
	const idx = WEEKDAY_ORDER.indexOf(day.trim().toLowerCase());
	return idx >= 0 ? idx + 1 : WEEKDAY_ORDER.length + 1;
}

function formatMealTypeSuffix(meal: string, settings: RecipeBoxSettings): string {
	const field = settings.mealTypeFieldName || "meal";
	switch (settings.mealTypeNotation) {
		case "tag":      return ` #${field}/${slugifyMealType(meal)}`;
		case "dataview": return ` [${field}:: ${meal}]`;
		case "text":     return ` (${meal})`;
	}
}

export function renderMealPlanLine(entry: MealPlanEntry, recipeName: string, settings: RecipeBoxSettings): string {
	const suffix = entry.meal ? formatMealTypeSuffix(entry.meal, settings) : "";
	return `- [ ] [[${recipeName}]]${suffix}`;
}

export function insertMealPlanEntryIntoText(noteText: string, entry: MealPlanEntry, recipeName: string, settings: RecipeBoxSettings): string {
	if (!entry.recipePath) return noteText; // leftovers are state-only
	const targetHeader = entry.day ?? "Meal Plan Queue";
	const newLine = renderMealPlanLine(entry, recipeName, settings);
	const lines = noteText.split("\n");

	const headingIdx = lines.findIndex((l) => l.trim() === `## ${targetHeader}` || (!entry.day && l.trim() === "## Unscheduled"));

	if (headingIdx >= 0) {
		let endIdx = lines.length;
		for (let i = headingIdx + 1; i < lines.length; i++) {
			if (lines[i].startsWith("## ")) { endIdx = i; break; }
		}
		let insertAt = endIdx;
		while (insertAt > headingIdx + 1 && !lines[insertAt - 1].trim()) insertAt--;
		lines.splice(insertAt, 0, newLine);
		return lines.join("\n");
	}

	// New section — find position by day-rank ordering
	const targetRank = dayRank(targetHeader);
	let insertSectionAt = lines.length;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith("## ") && dayRank(lines[i].slice(3).trim()) > targetRank) {
			insertSectionAt = i;
			break;
		}
	}
	if (!isQueueLabel(targetHeader)) {
		lines.splice(insertSectionAt, 0, `## ${targetHeader}`, newLine, "");
	} else {
		lines.splice(insertSectionAt, 0, newLine);
	}
	return lines.join("\n");
}

export function writeMealPlanNote(
	sections: MealPlanSection[],
	newEntries: MealPlanEntry[],
	getRecipeName: (path: string) => string,
	settings: RecipeBoxSettings,
): string {
	const noteEntries = newEntries.filter((e) => e.recipePath); // leftovers are state-only
	const byDay = new Map<string, MealPlanEntry[]>();
	for (const entry of noteEntries) {
		const day = entry.day ?? "Meal Plan Queue";
		if (!byDay.has(day)) byDay.set(day, []);
		byDay.get(day)!.push(entry);
	}

	const existingDays = new Set(sections.map((s) => s.header ?? "Meal Plan Queue"));
	const allDays = [...new Set([...byDay.keys(), ...existingDays])].sort((a, b) => dayRank(a) - dayRank(b));

	const lines: string[] = ["# Meal Plan", ""];
	for (const day of allDays) {
		const dayEntries = byDay.get(day) ?? [];
		const oldSection = sections.find((s) => (s.header ?? "Meal Plan Queue") === day);
		const preserved = oldSection?.lines.filter((l) => l.kind === "raw" && l.raw.trim()) ?? [];

		if (dayEntries.length === 0 && preserved.length === 0) continue;

		if (!isQueueLabel(day)) lines.push(`## ${day}`);
		for (const entry of dayEntries) {
			lines.push(renderMealPlanLine(entry, getRecipeName(entry.recipePath), settings));
		}
		for (const raw of preserved) lines.push(raw.raw);
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}
