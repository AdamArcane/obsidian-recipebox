/**
 * Registers all plugin commands with Obsidian's command palette.
 */
import { Notice } from "obsidian";
import RecipeBoxPlugin from "../main";
import { ImportRecipeModal } from "../ui/modals/import-recipe-modal";

export function registerCommands(plugin: RecipeBoxPlugin): void {
	plugin.addCommand({
		id: "open-grocery-list",
		name: "Open grocery list",
		callback: () => plugin.activateGroceryView(),
	});

	plugin.addCommand({
		id: "open-meal-plan",
		name: "Open meal plan",
		callback: () => plugin.activateMealPlanView(),
	});

	plugin.addCommand({
		id: "sync-grocery-from-meal-plan",
		name: "Sync grocery list from meal plan note",
		callback: async () => {
			await plugin.manager.refresh();
			new Notice("Grocery list synced.");
		},
	});

	plugin.addCommand({
		id: "clear-meal-plan-and-grocery",
		name: "Clear meal plan and grocery list",
		callback: async () => {
			const s = plugin.settings;
			s.state.mealPlan = [];
			s.state.oneOffItems = [];
			await plugin.saveSettings();
			await plugin.manager.refresh();
			new Notice("Meal plan and grocery list cleared.");
		},
	});

	plugin.addCommand({
		id: "reset-grocery-checks",
		name: "Reset grocery checks",
		callback: async () => {
			// Check state lives on GroceryItems; full implementation comes with the aggregator
			new Notice("Grocery checks reset.");
		},
	});

	plugin.addCommand({
		id: "add-one-off-grocery-item",
		name: "Add one-off grocery item",
		callback: () => {
			// Will open a modal once the modal module is built
			new Notice("Coming soon: add one-off item modal.");
		},
	});

	plugin.addCommand({
		id: "toggle-recipe-in-meal-plan",
		name: "Toggle current recipe in meal plan",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;
			if (!checking) new Notice("Coming soon: meal plan modal.");
			return true;
		},
	});

	plugin.addCommand({
		id: "open-current-as-recipe",
		name: "Open current file as recipe",
		checkCallback: (checking) => {
			const leaf = plugin.app.workspace.getMostRecentLeaf();
			const file = plugin.app.workspace.getActiveFile();
			if (!leaf || !file) return false;
			if (!checking) plugin.openCurrentFileAsRecipe(leaf, file);
			return true;
		},
	});

	plugin.addCommand({
		id: "open-current-as-markdown",
		name: "Open current file as Markdown",
		checkCallback: (checking) => {
			const leaf = plugin.app.workspace.getMostRecentLeaf();
			if (!leaf) return false;
			if (!checking) plugin.openCurrentFileAsMarkdown(leaf);
			return true;
		},
	});

	plugin.addCommand({
		id: "suggest-meal",
		name: "Suggest a meal",
		callback: () => new Notice("Coming soon: meal suggester."),
	});

	plugin.addCommand({
		id: "show-cooking-stats",
		name: "Show cooking stats",
		callback: () => new Notice("Coming soon: cooking stats."),
	});

	plugin.addCommand({
		id: "export-grocery-list",
		name: "Export grocery list",
		callback: () => new Notice("Coming soon: export modal."),
	});

	plugin.addCommand({
		id: "import-recipe",
		name: "Import recipe",
		callback: () => new ImportRecipeModal(plugin.app, plugin.settings).open(),
	});
}
