/**
 * Central GroceryManager — owns the authoritative GroceryItem list and
 * coordinates all meal-plan, manually-added grocery item, check-state, and
 * grocery-note mutations.
 *
 * Extends Obsidian's Events so UI components can subscribe to the "change" event
 * without needing a direct reference to any view.
 */
import { App, Events } from "obsidian";
import { ContributionMap, GroceryContributionSource, GroceryItem, GroceryItemEntry, MealPlanEntry } from "../types";
import { writeNote, resolveNotePath } from "../utils/vault-notes";
import { rebuildGroceryItems } from "./grocery-rebuild";
import { isGroupCollapsed, setGroupCollapsed, autoCollapseGroups } from "./group-collapse";
import { addToMealPlan, addToGroceryOnly, removeFromMealPlan, rescheduleMealPlanEntry, addMealPlanEntry, addCustomMealEntry, editCustomMealEntry, setMealPlanEntryMealType, clearMealPlan } from "../meal-plan/meal-plan-actions";
import { addGroceryItem, updateGroceryItem, removeGroceryItem, removeFromGroceryByKey } from "./grocery-item-actions";
import { syncMealPlanNote, GroceryManagerSink } from "../meal-plan/meal-plan-note-sync";
import { toggleGroceryNoteItemChecked, resetGroceryNoteChecks, setAllGroceryNoteChecks } from "./grocery-note/read";

export { GroceryManagerSink };

export class GroceryManager extends Events {
	private items: GroceryItem[] = [];
	private rebuilding: Promise<void> | null = null;
	/** Meal plan edits made by this plugin that are still running. See syncFromMealPlanNote. */
	private mealPlanMutations = 0;

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

	/**
	 * Runs one of our own meal plan edits. Several of them write the note in two
	 * steps (remove the line, then insert it again), so for a moment the note is
	 * missing an entry that still exists in saved state. A note-to-state sync that
	 * ran in that gap would delete the entry and its grocery contributions.
	 */
	private async mutatingMealPlan<T>(fn: () => Promise<T>): Promise<T> {
		this.mealPlanMutations++;
		try {
			return await fn();
		} finally {
			this.mealPlanMutations--;
		}
	}

	async addToMealPlan(recipePath: string, day?: string, mealType?: string, contributions: ContributionMap = {}, isLeftovers = false): Promise<void> {
		const s = this.sink.getSettings();
		await this.mutatingMealPlan(() => addToMealPlan(this.app, recipePath, day, mealType, contributions, s, () => this.sink.save(), isLeftovers));
		await this.refresh();
	}

	async addToGroceryOnly(contributions: ContributionMap, source: GroceryContributionSource, silent = false): Promise<void> {
		await addToGroceryOnly(this.app, contributions, source, this.sink.getSettings(), silent);
		await this.sink.save();
		await this.refresh();
	}

	async addMealPlanEntry(recipePath: string, day?: string, isLeftovers = false): Promise<string> {
		const id = await this.mutatingMealPlan(() => addMealPlanEntry(this.app, recipePath, day, this.sink.getSettings(), () => this.sink.save(), isLeftovers));
		await this.refresh();
		return id;
	}

	async setMealType(id: string, mealType: string | undefined): Promise<void> {
		await this.mutatingMealPlan(() => setMealPlanEntryMealType(this.app, id, mealType, this.sink.getSettings(), () => this.sink.save()));
		this.trigger("change");
	}

	async addCustomMealEntry(label: string, day?: string, meal?: string, isLeftovers = false): Promise<string> {
		const id = await this.mutatingMealPlan(() => addCustomMealEntry(this.app, label, day, meal, isLeftovers, this.sink.getSettings(), () => this.sink.save()));
		this.trigger("change");
		return id;
	}

	async editCustomMealEntry(id: string, updates: { day?: string; meal?: string; label?: string; isLeftovers?: boolean }): Promise<void> {
		await this.mutatingMealPlan(() => editCustomMealEntry(this.app, id, updates, this.sink.getSettings(), () => this.sink.save()));
		this.trigger("change");
	}

	async removeFromMealPlan(id: string): Promise<void> {
		await this.mutatingMealPlan(() => removeFromMealPlan(this.app, id, this.sink.getSettings(), () => this.sink.save()));
		await this.refresh();
	}

	async rescheduleMealPlanEntry(id: string, newDay: string | undefined): Promise<void> {
		await this.mutatingMealPlan(() => rescheduleMealPlanEntry(this.app, id, newDay, this.sink.getSettings(), () => this.sink.save()));
		this.trigger("change");
	}

	async clearMealPlan(alsoRemoveFromGrocery: boolean): Promise<number> {
		const count = await this.mutatingMealPlan(async () => {
			const n = await clearMealPlan(this.app, alsoRemoveFromGrocery, this.sink.getSettings(), () => this.sink.save());
			await writeNote(this.app, resolveNotePath(this.sink.getSettings().mealPlanPath), "# Meal Plan\n");
			return n;
		});
		await this.refresh();
		return count;
	}

	async syncFromMealPlanNote(): Promise<void> {
		// Skip while one of our own edits is mid-write. Its final note state will
		// match saved state, so nothing is lost by waiting for the next trigger.
		if (this.mealPlanMutations > 0) return;
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

	async setAllChecked(checked: boolean): Promise<void> {
		const s = this.sink.getSettings();
		await setAllGroceryNoteChecks(this.app, checked, s);
		for (const item of this.items) item.checked = checked;
		// Clear collapsed sections so groups don't stay hidden after unchecking.
		s.state.collapsedSections = {};
		await this.sink.save();
		this.trigger("change");
	}

	/** Clears the grocery list (items, contributions, note) without touching the meal plan. */
	async clearGroceryOnly(): Promise<void> {
		const s = this.sink.getSettings();
		s.state.groceryItems = [];
		s.state.groceryContributions = {};
		s.state.collapsedSections = {};
		await this.sink.save();
		await writeNote(this.app, resolveNotePath(s.groceryListPath), "# Grocery List\n");
		this.items = [];
		this.trigger("change");
	}

	async resetChecks(): Promise<void> {
		const s = this.sink.getSettings();
		await resetGroceryNoteChecks(this.app, s);
		s.state.collapsedSections = {};
		await this.sink.save();
		await this.refresh();
	}
}
