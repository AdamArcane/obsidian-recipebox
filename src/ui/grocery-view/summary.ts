/**
 * Renders the summary bar at the top of the grocery list, composing the
 * meal-plan carousel and the checked/total item count with a link to the note.
 */
import { App } from "obsidian";
import { GroceryItem, MealPlanEntry } from "../../types";
import { GroceryViewDeps } from "./grocery-view-deps";
import { renderMealPlanCarousel } from "./meal-plan-carousel";

export function renderSummary(
	container: HTMLElement,
	items: GroceryItem[],
	mealPlan: MealPlanEntry[],
	app: App,
	deps: GroceryViewDeps
): void {
	renderMealPlanCarousel(container, mealPlan, app, deps);

	if (items.length > 0) {
		const checkedCount = items.filter((i) => i.checked).length;
		const groceryRow = container.createDiv({ cls: "rb-gv-summary-row rb-gv-grocery-row" });
		groceryRow.createSpan({
			cls: "rb-gv-summary-label",
			text: `${checkedCount}/${items.length} checked`,
		});
		groceryRow.createSpan({ text: " " });
		const groceryLink = groceryRow.createEl("a", { cls: "rb-gv-summary-link", text: "View grocery list →" });
		groceryLink.addEventListener("click", () => {
			void deps.openOrCreateNote(deps.getSettings().groceryListPath);
		});
	}
}
