/**
 * Week-at-a-glance meal plan preview: seven thin day columns, each showing a
 * dot per scheduled entry (or a dash when empty). This is a separate,
 * simplified component from week-grid.ts -- it deliberately does not carry
 * that view's drag-and-drop rescheduling wiring, which a glance preview has
 * no business owning (see dashboard-spec.md section 11.3).
 */
import { Menu } from "obsidian";
import { MealPlanEntry } from "../../types";

export interface MealPlanMiniGridActions {
	openRecipe: (path: string) => void;
	openMealPlanView: () => void;
	openSuggestMealModal: () => void;
}

const DAY_COLUMNS: Array<{ label: string; abbrev: string }> = [
	{ label: "Monday", abbrev: "Mon" },
	{ label: "Tuesday", abbrev: "Tue" },
	{ label: "Wednesday", abbrev: "Wed" },
	{ label: "Thursday", abbrev: "Thu" },
	{ label: "Friday", abbrev: "Fri" },
	{ label: "Saturday", abbrev: "Sat" },
	{ label: "Sunday", abbrev: "Sun" },
];

// Fixed colors for the four common meal-type chips (see meal-type-popover.ts);
// anything else typed in freely still gets a dot, just uncolored, since there's
// no configured set of custom meal types to map onto a palette.
const MEAL_TYPE_DOT_CLASS: Record<string, string> = {
	breakfast: "rb-dashboard-mpg-dot--breakfast",
	lunch: "rb-dashboard-mpg-dot--lunch",
	dinner: "rb-dashboard-mpg-dot--dinner",
	snack: "rb-dashboard-mpg-dot--snack",
};

function openDayMenu(evt: MouseEvent, dayEntries: MealPlanEntry[], actions: MealPlanMiniGridActions): void {
	const menu = new Menu();
	for (const entry of dayEntries) {
		const title = entry.recipePath ? entry.recipePath.split("/").pop()!.replace(/\.md$/, "") : (entry.label ?? "Custom meal");
		menu.addItem((item) =>
			item.setTitle(entry.meal ? `${title} (${entry.meal})` : title)
				.setIcon(entry.recipePath ? "utensils" : "utensils-crossed")
				.onClick(() => {
					if (entry.recipePath) actions.openRecipe(entry.recipePath);
					else actions.openMealPlanView();
				})
		);
	}
	menu.showAtMouseEvent(evt);
}

export function renderMealPlanMiniGrid(
	container: HTMLElement,
	entries: MealPlanEntry[],
	actions: MealPlanMiniGridActions,
): void {
	const grid = container.createDiv({ cls: "rb-dashboard-mpg" });

	for (const col of DAY_COLUMNS) {
		const dayEntries = entries.filter((e) => e.day?.toLowerCase() === col.label.toLowerCase());
		const colEl = grid.createDiv({ cls: "rb-dashboard-mpg-col", attr: { role: "button", tabindex: "0" } });
		colEl.createDiv({ cls: "rb-dashboard-mpg-day", text: col.abbrev });

		const dotsEl = colEl.createDiv({ cls: "rb-dashboard-mpg-dots" });
		if (dayEntries.length === 0) {
			dotsEl.createSpan({ cls: "rb-dashboard-mpg-empty", text: "–" });
		} else {
			for (const entry of dayEntries) {
				const mealKey = entry.meal?.toLowerCase();
				const colorClass = mealKey ? MEAL_TYPE_DOT_CLASS[mealKey] : undefined;
				dotsEl.createSpan({ cls: `rb-dashboard-mpg-dot${colorClass ? ` ${colorClass}` : ""}` });
			}
		}

		colEl.addEventListener("click", (e) => {
			if (dayEntries.length === 0) actions.openSuggestMealModal();
			else openDayMenu(e, dayEntries, actions);
		});
	}
}
