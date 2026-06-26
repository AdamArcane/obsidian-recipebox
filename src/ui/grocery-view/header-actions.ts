/**
 * Renders the action bar at the top of the grocery view — sync, grouping,
 * export, reset, add-item, and clear buttons.
 */
import { Menu, Notice, setIcon } from "obsidian";
import { GroupingMode } from "../../types";
import { GroceryViewDeps } from "./grocery-view-deps";
import { ConfirmModal } from "../modals/confirm-modal";
import { App } from "obsidian";

const GROUPING_LABELS: Record<GroupingMode, string> = {
	category: "Group by category",
	recipe: "Group by recipe",
	source: "Group by source",
	none: "No grouping",
};

export function renderHeaderActions(
	container: HTMLElement,
	app: App,
	deps: GroceryViewDeps,
	onRefresh: () => void
): void {
	const bar = container.createDiv({ cls: "rb-gv-header" });

	const syncBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Sync from meal plan note" } });
	setIcon(syncBtn, "refresh-cw");
	syncBtn.addEventListener("click", () => {
		void deps.syncFromMealPlanNote().then(() => {
			onRefresh();
			new Notice("Grocery list synced from meal plan.");
		});
	});

	const groupBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Change grouping" } });
	setIcon(groupBtn, "layers");
	groupBtn.addEventListener("click", (e) => {
		const menu = new Menu();
		const currentMode = deps.getSettings().groupingMode;
		for (const [mode, label] of Object.entries(GROUPING_LABELS) as [GroupingMode, string][]) {
			menu.addItem((item) => {
				item.setTitle(label).setChecked(currentMode === mode);
				item.onClick(() => {
					deps.getSettings().groupingMode = mode;
					void deps.saveSettings().then(() => onRefresh());
				});
			});
		}
		const rect = groupBtn.getBoundingClientRect();
		menu.showAtPosition({ x: e.clientX || rect.left, y: e.clientY || rect.bottom });
	});

	const exportBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Export grocery list" } });
	setIcon(exportBtn, "share");
	exportBtn.addEventListener("click", () => deps.openExportModal());

	const resetBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Reset all checks" } });
	setIcon(resetBtn, "rotate-ccw");
	resetBtn.addEventListener("click", () => {
		void deps.resetChecks().then(() => new Notice("All checks cleared."));
	});

	const addBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Add grocery item" } });
	setIcon(addBtn, "plus");
	addBtn.addEventListener("click", () => deps.openAddGroceryItemModal());

	const clearBtn = bar.createDiv({ cls: "rb-gv-header-btn rb-gv-header-btn--danger", attr: { "aria-label": "Clear all items" } });
	setIcon(clearBtn, "trash-2");
	clearBtn.addEventListener("click", () => {
		new ConfirmModal(
			app,
			"Clear grocery list",
			"This will clear all items from both the grocery note and the meal plan note — not just the in-memory list. This cannot be undone.",
			"Clear all",
			{
				destructive: true,
				onConfirm: () => {
					void deps.clearAll().then(() => new Notice("Grocery list cleared."));
				},
			},
		).open();
	});
}
