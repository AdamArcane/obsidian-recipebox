import { ItemView, WorkspaceLeaf } from "obsidian";
import { GroceryViewDeps } from "./grocery-view-deps";
import { renderHeaderActions } from "./header-actions";
import { renderSummary } from "./summary";
import { buildDisplayGroups } from "./display-groups";
import { renderGroupSection } from "./group-section";

export const GROCERY_VIEW_TYPE = "recipe-box-grocery-view";

export class GroceryView extends ItemView {
	private deps: GroceryViewDeps;
	private unsubscribe: (() => void) | null = null;
	private cleanups: Array<() => void> = [];

	constructor(leaf: WorkspaceLeaf, deps: GroceryViewDeps) {
		super(leaf);
		this.deps = deps;
		this.navigation = true;
	}

	getViewType(): string {
		return GROCERY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Shopping assistant";
	}

	getIcon(): string {
		return "shopping-cart";
	}

	async onOpen(): Promise<void> {
		this.unsubscribe = this.deps.subscribeToChanges(() => this.renderList());
		renderHeaderActions(this.contentEl, this.app, this.deps, () => this.renderList());
		this.renderList();
		// Sync meal plan note in the background so the carousel populates without
		// requiring a manual button press. renderList() will re-run via the
		// "change" event if anything changed.
		void this.deps.syncFromMealPlanNote();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.teardownCleanups();
	}

	private teardownCleanups(): void {
		for (const fn of this.cleanups) fn();
		this.cleanups = [];
	}

	private renderList(): void {
		const existing = this.contentEl.querySelector(".rb-gv-content");
		if (existing) existing.remove();
		this.teardownCleanups();

		const content = this.contentEl.createDiv({ cls: "rb-gv-content" });
		const items = this.deps.getGroceryItems();
		const mealPlan = this.deps.getMealPlan();
		const mode = this.deps.getSettings().groupingMode;

		renderSummary(content, items, mealPlan, this.app, this.deps);

		if (items.length === 0) {
			const empty = content.createDiv({ cls: "rb-gv-empty" });
			empty.createEl("p", { text: "Your grocery list is empty." });
			empty.createEl("p", {
				cls: "rb-gv-empty-hint",
				text: 'Add meals to your meal plan note to populate the list, or tap + to add items manually.',
			});
			return;
		}

		const groups = buildDisplayGroups(items, mode);
		const listEl = content.createDiv({ cls: "rb-gv-list" });
		for (const group of groups) {
			renderGroupSection(listEl, group, mode, this.deps, this.cleanups);
		}
	}
}
