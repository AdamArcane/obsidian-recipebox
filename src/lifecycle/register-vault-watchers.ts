import { TFile } from "obsidian";
import RecipeBoxPlugin from "../main";
import { debounce } from "../utils/debounce";

export function registerVaultWatchers(plugin: RecipeBoxPlugin): void {
	const syncMealPlan = debounce(() => { void plugin.manager.refresh(); }, 500, true);
	const refreshGrocery = debounce(() => { void plugin.manager.refresh(); }, 300, true);

	plugin.registerEvent(
		plugin.app.vault.on("modify", (file) => {
			if (!(file instanceof TFile)) return;
			if (file.path === plugin.settings.mealPlanPath) {
				syncMealPlan();
			} else if (file.path === plugin.settings.groceryListPath) {
				refreshGrocery();
			}
		})
	);

	plugin.registerEvent(
		plugin.app.vault.on("delete", () => { void plugin.manager.refresh(); })
	);

	plugin.registerEvent(
		plugin.app.vault.on("rename", () => { void plugin.manager.refresh(); })
	);
}
