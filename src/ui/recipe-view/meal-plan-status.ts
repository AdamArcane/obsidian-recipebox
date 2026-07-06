/**
 * Renders the meal plan status notice in the recipe view — showing whether
 * a recipe is scheduled, on which day, and offering a context menu for edits.
 */
import { App, setIcon, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { openMealPlanEntryMenu } from "../modals/meal-plan-entry-menu";
import { MealPlanMultiEntryMenu } from "../modals/meal-plan-multientry-menu";

export function resolveStatusText(entries: MealPlanEntry[]): string {
	if (entries.length === 0) return "";
	if (entries.length === 2) return "Scheduled twice this week";
	if (entries.length > 2) return `Scheduled ${entries.length} times this week`;

	const entry = entries[0];
	let statusText = "";

	if (entry.day && entry.meal) statusText = `${entry.meal} on ${entry.day}`;
	if (entry.day && !entry.meal) statusText = `Scheduled for ${entry.day}`;
	if (!entry.day && entry.meal) statusText = `${entry.meal}, in queue`;
	if (!entry.day && !entry.meal) statusText = "In queue";
	
	if (entry.isLeftovers) statusText += " as leftovers";

	return statusText;
}

export function renderMealPlanStatus(
	container: HTMLElement,
	app: App,
	file: TFile,
	entries: MealPlanEntry[],
	deps: RecipeViewDeps,
): void {
	if (entries.length === 0) return;

	const row = container.createDiv({ cls: "rb-mp-status-row" });

	const iconEl = row.createSpan({ cls: "rb-mp-status-icon" });
	setIcon(iconEl, "calendar");

	row.createSpan({ cls: "rb-mp-status-text", text: resolveStatusText(entries) });

	const chevronEl = row.createSpan({ cls: "rb-mp-status-chevron" });
	setIcon(chevronEl, "chevron-right");

	row.addEventListener("click", (e) => {
		if (entries.length === 1) {
			openMealPlanEntryMenu(e, app, file, entries[0], deps);
		} else {
			new MealPlanMultiEntryMenu(app, file, entries, deps).open();
		}
	});
}
