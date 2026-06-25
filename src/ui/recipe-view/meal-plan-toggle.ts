/**
 * Renders the add-to / remove-from meal plan toggle button in the recipe view header.
 */
import { App, setIcon, TFile } from "obsidian";
import { ContributionMap, MealPlanEntry } from "../../types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { openMealPlanEntryMenu } from "../modals/meal-plan-entry-menu";
import { MealPlanMultiEntryMenu } from "../modals/meal-plan-multientry-menu";


export function renderMealPlanToggle(
	container: HTMLElement,
	app: App,
	file: TFile,
	inPlan: boolean,
	entries: MealPlanEntry[],
	deps: RecipeViewDeps,
): void {
	const btn = container.createEl("button", {
		cls: ["rb-action-btn", inPlan ? "rb-meal-plan-active" : ""],
		attr: {
			"aria-pressed": String(inPlan),
			"aria-label": inPlan ? "Remove from meal plan" : "Add to meal plan",
		},
	});
	const iconEl = btn.createSpan();
	setIcon(iconEl, inPlan ? "calendar-check-2" : "calendar-plus");

	btn.addEventListener("click", (e) => {
		if (inPlan) {
			if (entries.length === 1) {
				openMealPlanEntryMenu(e, app, file, entries[0], deps);
			} else {
				new MealPlanMultiEntryMenu(app, file, entries, deps).open();
			}
		} else {
			deps.openAddToMealPlanModal(file, (day, meal, contributions?: ContributionMap) => {
				void deps.addToMealPlan(file.path, day, meal, contributions);
			});
		}
	});


}
