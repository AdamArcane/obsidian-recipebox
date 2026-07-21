/**
 * The dashboard's top action bar: a recipe search box on the left, quick
 * action buttons on the right. Deliberately excludes separate "open grocery/
 * meal plan/gallery" buttons -- each section below already has a footer link
 * one click away (see dashboard-spec.md section 7). Search hands off to the
 * gallery's own search/filter state rather than re-implementing matching here.
 */
import { setIcon } from "obsidian";

export interface QuickActionsActions {
	openImportModal: () => void;
	openAddGroceryItemModal: () => void;
	openSuggestMealModal: () => void;
	searchRecipes: (query: string) => void;
}

function renderSearchBox(row: HTMLElement, onSearch: (query: string) => void): void {
	const box = row.createDiv({ cls: "rb-dashboard-search" });
	setIcon(box.createSpan({ cls: "rb-dashboard-search-icon" }), "search");
	const input = box.createEl("input", {
		cls: "rb-dashboard-search-input",
		attr: { type: "text", placeholder: "Search recipes…" },
	});
	input.addEventListener("keydown", (e) => {
		if (e.key !== "Enter") return;
		e.preventDefault();
		const query = input.value.trim();
		if (query) onSearch(query);
	});
}

function renderActionButton(row: HTMLElement, icon: string, label: string, onClick: () => void): void {
	const btn = row.createEl("button", { cls: "rb-dashboard-quick-action-btn" });
	setIcon(btn.createSpan({ cls: "rb-dashboard-quick-action-icon" }), icon);
	btn.createSpan({ text: label });
	btn.addEventListener("click", onClick);
}

export function renderQuickActions(container: HTMLElement, actions: QuickActionsActions): void {
	const row = container.createDiv({ cls: "rb-dashboard-quick-actions rb-dashboard-span-12" });

	renderSearchBox(row, actions.searchRecipes);

	const buttons = row.createDiv({ cls: "rb-dashboard-quick-action-buttons" });
	renderActionButton(buttons, "plus", "Add recipe", actions.openImportModal);
	renderActionButton(buttons, "shopping-cart", "Add grocery item", actions.openAddGroceryItemModal);
	renderActionButton(buttons, "wand-sparkles", "Suggest a meal", actions.openSuggestMealModal);
}
