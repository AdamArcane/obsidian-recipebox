/**
 * Renders the add-to / remove-from meal plan toggle button in the recipe view header.
 */
import { setIcon, TFile } from "obsidian";
import { ContributionMap } from "../../types";
import { RecipeViewDeps } from "./recipe-view-deps";

export function renderMealPlanToggle(
	container: HTMLElement,
	file: TFile,
	inPlan: boolean,
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
	setIcon(iconEl, inPlan ? "calendar-minus" : "calendar-plus");

	btn.addEventListener("click", () => {
		if (inPlan) {
			void deps.removeFromMealPlan(file.path);
		} else {
			deps.openAddToMealPlanModal(file, (day, meal, contributions?: ContributionMap) => {
				void deps.addToMealPlan(file.path, day, meal, contributions);
			});
		}
	});
}
