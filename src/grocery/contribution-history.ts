/**
 * Maintains the persisted per-key grocery contribution history stored in
 * settings.state.groceryContributions, which maps each grocery note key to the
 * ordered list of individual source contributions currently backing its quantity.
 * This lets rebuildGroceryItems attribute each line directly without inference.
 */
import { ContributionMap, GroceryContributionSource } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";

function sourcesMatch(a: GroceryContributionSource, b: GroceryContributionSource): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === "recipe" && b.kind === "recipe") return a.path === b.path;
	return true;
}

export function recordContributions(
	contributions: ContributionMap,
	source: GroceryContributionSource,
	settings: RecipeBoxSettings,
): void {
	const history = settings.state.groceryContributions;
	for (const [key, contrib] of Object.entries(contributions)) {
		if (!history[key]) history[key] = [];
		// Guard against double-recording from the same source (e.g. addToMealPlan then
		// addToGroceryOnly both called for the same recipe). sourcesMatch compares recipe
		// sources by path so this catches all combinations regardless of day/mealType.
		if (history[key].some(r => sourcesMatch(r.source, source))) continue;
		history[key].push({ source, quantity: contrib.quantity });
	}
}

export function unrecordContributions(
	contributions: ContributionMap,
	source: GroceryContributionSource,
	settings: RecipeBoxSettings,
): void {
	const history = settings.state.groceryContributions;
	for (const [key, contrib] of Object.entries(contributions)) {
		const list = history[key];
		if (!list) continue;
		const idx = list.findIndex(r => sourcesMatch(r.source, source) && r.quantity === contrib.quantity);
		if (idx >= 0) list.splice(idx, 1);
		if (list.length === 0) delete history[key];
	}
}

/**
 * Strips `day` and `mealType` from every contribution source record that
 * references the given recipe path, without touching quantities or removing
 * records. Used when clearing the meal plan but keeping grocery items: the
 * items are still honestly attributed to the recipe, just no longer claimed
 * to be scheduled for a specific day.
 */
export function severScheduleLinks(recipePath: string, settings: RecipeBoxSettings): void {
	const history = settings.state.groceryContributions;
	for (const list of Object.values(history)) {
		for (const record of list) {
			if (record.source.kind === "recipe" && record.source.path === recipePath) {
				record.source = { kind: "recipe", path: recipePath };
			}
		}
	}
}
