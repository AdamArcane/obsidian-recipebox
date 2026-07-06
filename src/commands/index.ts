/**
 * Registers all plugin commands with Obsidian's command palette.
 * Commands earn their place only if they're worth triggering without first
 * navigating to the view that already surfaces them as a button — genuine
 * "jump there" or "act on whatever I'm currently looking at" shortcuts.
 */
import { Notice } from "obsidian";
import RecipeBoxPlugin from "../main";
import { ImportRecipeModal } from "../ui/modals/import-recipe-modal";
import { AddGroceryItemModal } from "../ui/modals/add-grocery-item-modal";
import { AddToMealPlanModal } from "../ui/modals/add-to-meal-plan-modal";
import { SuggestMealModal } from "../ui/modals/suggest-meal-modal";
import { isRecipeFile } from "../lifecycle/recipe-file-detection";
import { RecipeView, RECIPE_VIEW_TYPE } from "../ui/recipe-view/recipe-view";

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
		id: "import-recipe",
		name: "Import recipe",
		callback: () => new ImportRecipeModal(plugin.app, plugin.settings).open(),
	});

	plugin.addCommand({
		id: "add-grocery-item",
		name: "Add grocery item",
		callback: () => {
			new AddGroceryItemModal(plugin.app, {
				addGroceryItem: (item) => plugin.manager.addGroceryItem(item),
				updateGroceryItem: (id, updates) => plugin.manager.updateGroceryItem(id, updates),
				getKnownCategories: () => plugin.manager.getKnownCategories(),
			}).open();
		},
	});

	plugin.addCommand({
		id: "toggle-recipe-in-meal-plan",
		name: "Toggle current recipe in meal plan",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || !isRecipeFile(plugin.app, file, plugin.settings)) return false;
			if (checking) return true;
			const entries = plugin.manager.mealPlan.filter(e => e.recipePath === file.path);
			if (entries.length > 0) {
				// Already scheduled — remove all entries for this recipe
				for (const entry of entries) void plugin.manager.removeFromMealPlan(entry.id);
			} else {
				new AddToMealPlanModal(
					plugin.app,
					{ kind: "recipe", file },
					plugin.settings,
					(day, meal, contributions) => {
						void plugin.manager.addToMealPlan(file.path, day, meal, contributions ?? {});
					},
				).open();
			}
			return true;
		},
	});

	plugin.addCommand({
		id: "open-current-as-recipe",
		name: "Open current file as recipe",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			// Eligible when a recipe file is active but not yet shown in the recipe view
			const eligible = !!file
				&& isRecipeFile(plugin.app, file, plugin.settings)
				&& !plugin.app.workspace.getActiveViewOfType(RecipeView);
			if (checking) return eligible;
			if (!eligible || !file) return;
			const leaf = plugin.app.workspace.getLeaf(false);
			plugin.openCurrentFileAsRecipe(leaf, file);
		},
	});

	plugin.addCommand({
		id: "open-current-as-markdown",
		name: "Open current file as Markdown",
		checkCallback: (checking) => {
			// Only relevant when the active view is the recipe view
			const view = plugin.app.workspace.getActiveViewOfType(RecipeView);
			if (checking) return !!view;
			if (view) plugin.openCurrentFileAsMarkdown(view.leaf);
		},
	});

	plugin.addCommand({
		id: "suggest-meal",
		name: "Suggest a meal",
		callback: () => {
			new SuggestMealModal(plugin.app, {
				getSettings: () => plugin.settings,
				saveSettings: () => plugin.saveSettings(),
				getDiscovery: () => plugin.discoveryCache.get(),
				openFile: (file) => {
					const leaf = plugin.app.workspace.getLeaf(false);
					void leaf.setViewState({ type: RECIPE_VIEW_TYPE, state: { file: file.path }, active: true });
				},
				addToQueue: async (files) => {
					for (const file of files) {
						await plugin.manager.addToMealPlan(file.path, undefined, undefined, {});
					}
				},
				openMealPlan: () => { void plugin.activateMealPlanView(); },
			}).open();
		},
	});

	plugin.addCommand({
		id: "show-cooking-stats",
		name: "Show cooking stats",
		callback: () => new Notice("Cooking stats are not yet available."),
	});
}
