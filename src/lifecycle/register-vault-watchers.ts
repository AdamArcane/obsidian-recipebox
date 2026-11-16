/**
 * Registers debounced vault event listeners that trigger a GroceryManager refresh
 * when the meal plan or grocery list notes are modified, deleted, or renamed.
 */
import { TFile } from "obsidian";
import RecipeBoxPlugin from "../main";
import { debounce } from "../utils/debounce";
import { resolveNotePath } from "../utils/vault-notes";

export function registerVaultWatchers(plugin: RecipeBoxPlugin): void {
	const syncMealPlan = debounce(() => { void plugin.manager.refresh(); }, 500, true);
	// Trailing edge only, unlike the refreshes here. A leading call would run on
	// the first of a burst of writes, and some edits write the note twice.
	const readPlanNote = debounce(() => { void plugin.manager.syncFromMealPlanNote(); }, 1000);
	const refreshGrocery = debounce(() => { void plugin.manager.refresh(); }, 300, true);

	plugin.registerEvent(
		plugin.app.vault.on("modify", (file) => {
			if (!(file instanceof TFile)) return;
			if (file.path === resolveNotePath(plugin.settings.mealPlanPath)) {
				syncMealPlan();
				// The refresh above only rebuilds the grocery list. This is what makes
				// the Meal Plan view follow a note changed on disk, e.g. by sync from another device.
				readPlanNote();
			} else if (file.path === resolveNotePath(plugin.settings.groceryListPath)) {
				refreshGrocery();
			}
		})
	);

	// Android can suspend the app while a sync tool updates the note, and the
	// change is not always reported as an event once it resumes.
	plugin.registerDomEvent(activeDocument, "visibilitychange", () => {
		if (activeDocument.visibilityState === "visible") readPlanNote();
	});

	plugin.registerEvent(
		plugin.app.vault.on("delete", () => { void plugin.manager.refresh(); })
	);

	plugin.registerEvent(
		plugin.app.vault.on("rename", () => { void plugin.manager.refresh(); })
	);
}
