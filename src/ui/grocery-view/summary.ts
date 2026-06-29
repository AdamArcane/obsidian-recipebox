/**
 * Renders the summary bar at the top of the grocery list: the meal-plan carousel.
 */
import { App } from "obsidian";
import { MealPlanEntry } from "../../types";
import { GroceryViewDeps } from "./grocery-view-deps";
import { renderMealPlanCarousel } from "./meal-plan-carousel";

export function renderSummary(
	container: HTMLElement,
	mealPlan: MealPlanEntry[],
	app: App,
	deps: GroceryViewDeps
): void {
	renderMealPlanCarousel(container, mealPlan, app, deps);
}
