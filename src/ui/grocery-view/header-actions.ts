/**
 * Renders the action toolbar at the top of the grocery view.
 * Toolbar order: group-by dropdown — export — clear grocery list.
 * "Add item" and "check all / uncheck all" live above the list, not here.
 */
import { Notice, setIcon } from "obsidian";
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

	// Labeled dropdown makes the current grouping visible without requiring a click,
	// replacing the old icon-only button that opened a hidden menu.
	const groupSelect = bar.createEl("select", { cls: "rb-gv-group-select" });
	for (const [mode, label] of Object.entries(GROUPING_LABELS) as [GroupingMode, string][]) {
		const opt = groupSelect.createEl("option", { value: mode, text: label });
		if (deps.getSettings().groupingMode === mode) opt.selected = true;
	}
	groupSelect.addEventListener("change", () => {
		deps.getSettings().groupingMode = groupSelect.value as GroupingMode;
		void deps.saveSettings().then(() => onRefresh());
	});

	const exportBtn = bar.createDiv({ cls: "rb-gv-header-btn", attr: { "aria-label": "Export grocery list" } });
	setIcon(exportBtn, "share");
	exportBtn.addEventListener("click", () => deps.openExportModal());

	const clearBtn = bar.createDiv({ cls: "rb-gv-header-btn rb-gv-header-btn--danger", attr: { "aria-label": "Clear grocery list" } });
	setIcon(clearBtn, "trash-2");
	clearBtn.addEventListener("click", () => {
		new ConfirmModal(
			app,
			"Clear grocery list",
			"This will remove all items from the grocery note. The meal plan is not affected.",
			"Clear grocery list",
			{
				destructive: true,
				onConfirm: () => {
					void deps.clearGroceryOnly().then(() => new Notice("Grocery list cleared."));
				},
			},
		).open();
	});
}
