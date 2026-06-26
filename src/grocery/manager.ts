/**
 * Central GroceryManager — owns the authoritative GroceryItem list and
 * coordinates all meal-plan, manually-added grocery item, check-state, and
 * grocery-note mutations.
 *
 * Extends Obsidian's Events so UI components can subscribe to the "change" event
 * without needing a direct reference to any view.
 */
import { App, Events, Notice } from "obsidian";
import { ContributionMap, GroceryContributionSource, GroceryItem, GroceryItemEntry, MealPlanEntry } from "../types";
import { writeNote } from "../utils/vault-notes";
import { rebuildGroceryItems } from "./grocery-rebuild";
import { isGroupCollapsed, setGroupCollapsed, autoCollapseGroups } from "./group-collapse";
import { addToMealPlan, addToGroceryOnly, removeFromMealPlan, rescheduleMealPlanEntry, addMealPlanEntry, addLeftoversEntry, setMealPlanEntryMealType, clearMealPlan } from "./meal-plan-actions";
import { addGroceryItem, updateGroceryItem, removeGroceryItem, removeFromGroceryByKey } from "./grocery-item-actions";
import { syncMealPlanNote, GroceryManagerSink } from "./meal-plan-note-sync";
import { toggleGroceryNoteItemChecked, resetGroceryNoteChecks } from "./grocery-note/read";

export { GroceryManagerSink };

export class GroceryManager extends Events {
	private items: GroceryItem[] = [];
	private rebuilding: Promise<void> | null = null;

	constructor(private app: App, private sink: GroceryManagerSink) {
		super();
	}

	get groceryItems(): GroceryItem[] { return [...this.items]; }
	get groceryItemEntries(): GroceryItemEntry[] { return this.sink.getSettings().state.groceryItems ?? []; }
	get mealPlan(): MealPlanEntry[] { return this.sink.getSettings().state.mealPlan ?? []; }

	// ── Refresh / rebuild ─────────────────────────────────────────────────────

	async refresh(): Promise<void> {
		if (this.rebuilding) return this.rebuilding;
		this.rebuilding = this.doRebuild()
			.catch((err) => console.error("Recipe Box: grocery rebuild failed", err))
			.finally(() => { this.rebuilding = null; });
		return this.rebuilding;
	}

	private async doRebuild(): Promise<void> {
		this.items = await rebuildGroceryItems(this.app, this.sink.getSettings());
		this.trigger("change");
	}

	// ── Meal plan ─────────────────────────────────────────────────────────────

	async addToMealPlan(recipePath: string, day?: string, mealType?: string, contributions: ContributionMap = {}): Promise<void> {
		const s = this.sink.getSettings();
		await addToMealPlan(this.app, recipePath, day, mealType, contributions, s, () => this.sink.save());
		await this.refresh();
	}

	async addToGroceryOnly(contributions: ContributionMap, source: GroceryContributionSource, silent = false): Promise<void> {
		await addToGroceryOnly(this.app, contributions, source, this.sink.getSettings(), silent);
		await this.sink.save();
		await this.refresh();
	}

	async addMealPlanEntry(recipePath: string, day?: string): Promise<string> {
		const id = await addMealPlanEntry(this.app, recipePath, day, this.sink.getSettings(), () => this.sink.save());
		await this.refresh();
		return id;
	}

	async setMealType(id: string, mealType: string | undefined): Promise<void> {
		await setMealPlanEntryMealType(this.app, id, mealType, this.sink.getSettings(), () => this.sink.save());
		this.trigger("change");
	}

	async addLeftoversEntry(day?: string, label = "Leftovers"): Promise<string> {
		const id = await addLeftoversEntry(day, label, this.sink.getSettings(), () => this.sink.save());
		this.trigger("change");
		return id;
	}

	async removeFromMealPlan(id: string): Promise<void> {
		await removeFromMealPlan(this.app, id, this.sink.getSettings(), () => this.sink.save());
		await this.refresh();
	}

	async rescheduleMealPlanEntry(id: string, newDay: string | undefined): Promise<void> {
		await rescheduleMealPlanEntry(this.app, id, newDay, this.sink.getSettings(), () => this.sink.save());
		this.trigger("change");
	}

	async clearMealPlan(alsoRemoveFromGrocery: boolean): Promise<number> {
		const count = await clearMealPlan(this.app, alsoRemoveFromGrocery, this.sink.getSettings(), () => this.sink.save());
		await writeNote(this.app, this.sink.getSettings().mealPlanPath, "# Meal Plan\n");
		await this.refresh();
		return count;
	}

	async syncFromMealPlanNote(): Promise<void> {
		const changed = await syncMealPlanNote(this.app, this.sink);
		if (changed) await this.refresh();
	}

	// ── Checked state ─────────────────────────────────────────────────────────

	async toggleChecked(key: string, checked: boolean): Promise<void> {
		const s = this.sink.getSettings();
		await toggleGroceryNoteItemChecked(this.app, key, checked, s);
		const item = this.items.find((i) => i.key === key);
		if (item) item.checked = checked;
		if (checked) await autoCollapseGroups(this.items, key, s, () => this.sink.save());
		this.trigger("change");
	}

	isGroupCollapsed(name: string): boolean {
		return isGroupCollapsed(this.sink.getSettings(), name);
	}

	async setGroupCollapsed(name: string, collapsed: boolean): Promise<void> {
		await setGroupCollapsed(this.sink.getSettings(), () => this.sink.save(), name, collapsed);
		this.trigger("change");
	}

	// ── One-off items ─────────────────────────────────────────────────────────

	async addGroceryItem(rawItem: Omit<GroceryItemEntry, "id">): Promise<void> {
		const result = await addGroceryItem(this.app, rawItem, this.sink.getSettings(), () => this.sink.save());
		if (result) await this.refresh();
	}

	async updateGroceryItem(id: string, updates: Partial<Omit<GroceryItemEntry, "id">>): Promise<void> {
		await updateGroceryItem(this.app, id, updates, this.sink.getSettings(), () => this.sink.save());
		await this.refresh();
	}

	async removeGroceryItem(id: string): Promise<void> {
		await removeGroceryItem(this.app, id, this.sink.getSettings(), () => this.sink.save());
		await this.refresh();
	}

	async removeFromGroceryByKey(key: string, silent = false): Promise<void> {
		await removeFromGroceryByKey(this.app, key, this.items, this.sink.getSettings(), silent);
		await this.refresh();
	}

	// ── Categories ────────────────────────────────────────────────────────────

	getKnownCategories(): string[] {
		const order = this.sink.getSettings().manualCategoryOrder;
		const active = new Set(this.items.map((i) => i.category));
		const extras = [...active]
			.filter((c) => !order.includes(c))
			.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
		return [...order, ...extras];
	}

	// ── Bulk operations ───────────────────────────────────────────────────────

	async clearAll(): Promise<{ mealPlanCount: number; groceryItemCount: number }> {
		const s = this.sink.getSettings();
		const mealPlanCount = s.state.mealPlan.length;
		const groceryItemCount = s.state.groceryItems.length;

		s.state.mealPlan = [];
		s.state.groceryItems = [];
		s.state.collapsedSections = {};
		await this.sink.save();

		await writeNote(this.app, s.mealPlanPath, "# Meal Plan\n");
		await writeNote(this.app, s.groceryListPath, "# Grocery List\n");

		this.items = [];
		this.trigger("change");

		const meals = mealPlanCount === 1 ? "meal" : "meals";
		const items = groceryItemCount === 1 ? "item" : "items";
		new Notice(`Cleared ${mealPlanCount} ${meals} and ${groceryItemCount} grocery ${items}.`);
		return { mealPlanCount, groceryItemCount };
	}

	async resetChecks(): Promise<void> {
		const s = this.sink.getSettings();
		await resetGroceryNoteChecks(this.app, s);
		s.state.collapsedSections = {};
		await this.sink.save();
		await this.refresh();
	}
}
