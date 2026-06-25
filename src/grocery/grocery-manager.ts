/**
 * Lightweight GroceryManager stub used during early bootstrap before the full
 * manager (manager.ts) takes over. Kept for backward compatibility with imports
 * that reference this path directly.
 */
import { GroceryItem, MealPlanEntry, OneOffItem } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";

export class GroceryManager {
	private changeListeners: Set<() => void> = new Set();

	constructor(
		private getSettings: () => RecipeBoxSettings,
		private saveSettings: () => Promise<void>
	) {}

	getMealPlan(): MealPlanEntry[] {
		return this.getSettings().state.mealPlan;
	}

	async addToMealPlan(entry: MealPlanEntry): Promise<void> {
		this.getSettings().state.mealPlan.push(entry);
		await this.saveSettings();
		this.notify();
	}

	async removeFromMealPlan(recipePath: string): Promise<void> {
		const s = this.getSettings();
		s.state.mealPlan = s.state.mealPlan.filter((e) => e.recipePath !== recipePath);
		await this.saveSettings();
		this.notify();
	}

	getGroceryItems(): GroceryItem[] {
		// Full aggregation logic will be added in the grocery aggregator module
		return [];
	}

	async addOneOffItem(item: OneOffItem): Promise<void> {
		this.getSettings().state.oneOffItems.push(item);
		await this.saveSettings();
		this.notify();
	}

	async removeOneOffItem(id: string): Promise<void> {
		const s = this.getSettings();
		s.state.oneOffItems = s.state.oneOffItems.filter((i) => i.id !== id);
		await this.saveSettings();
		this.notify();
	}

	subscribeToChanges(cb: () => void): () => void {
		this.changeListeners.add(cb);
		return () => this.changeListeners.delete(cb);
	}

	async refresh(): Promise<void> {
		this.notify();
	}

	private notify(): void {
		this.changeListeners.forEach((cb) => cb());
	}
}
