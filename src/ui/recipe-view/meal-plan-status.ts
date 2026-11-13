/**
 * Renders the meal plan status notice in the recipe view — showing whether
 * a recipe is scheduled, on which day, and offering a context menu for edits.
 */
import { dayLabel, mealLabel } from "../utils/localized-labels";
import { t as translateUi } from "../../i18n";
import { App, setIcon, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { openMealPlanEntryMenu } from "../modals/meal-plan-entry-menu";
import { MealPlanMultiEntryMenu } from "../modals/meal-plan-multientry-menu";

export function resolveStatusText(entries: MealPlanEntry[]): string {
	if (entries.length === 0) return "";
	if (entries.length === 2) return translateUi("Scheduled twice this week");
	if (entries.length > 2) return translateUi`Scheduled ${entries.length} times this week`;

	const entry = entries[0];
	let statusText = "";

	if (entry.day && entry.meal) statusText = translateUi`${mealLabel(entry.meal)} on ${dayLabel(entry.day)}`;
	if (entry.day && !entry.meal) statusText = translateUi`Scheduled for ${dayLabel(entry.day)}`;
	if (!entry.day && entry.meal) statusText = translateUi`${mealLabel(entry.meal)}, in queue`;
	if (!entry.day && !entry.meal) statusText = translateUi("In queue");
	
	if (entry.isLeftovers) statusText += translateUi(" as leftovers");

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
