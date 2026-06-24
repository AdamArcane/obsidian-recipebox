import { Notice, TFile } from "obsidian";
import RecipeBoxPlugin from "../main";
import { GroceryView, GROCERY_VIEW_TYPE } from "../ui/grocery-view";
import { RecipeView, RECIPE_VIEW_TYPE } from "../ui/recipe-view/recipe-view";
import { MealPlanView, MEAL_PLAN_VIEW_TYPE } from "../ui/meal-plan-view/meal-plan-view";
import { AddToMealPlanModal } from "../ui/modals/add-to-meal-plan-modal";
import { AddToGroceryModal } from "../ui/modals/add-to-grocery-modal";
import { MarkCookedModal } from "../ui/modals/mark-cooked-modal";
import { AddOneOffModal } from "../ui/modals/add-one-off-modal";
import { ExportModal } from "../ui/modals/export-modal";

export function registerViews(plugin: RecipeBoxPlugin): void {
	plugin.registerView(
		GROCERY_VIEW_TYPE,
		(leaf) =>
			new GroceryView(leaf, {
				getSettings: () => plugin.settings,
				saveSettings: () => plugin.saveSettings(),
				getGroceryItems: () => plugin.manager.groceryItems,
				getMealPlan: () => plugin.manager.mealPlan,
				getOneOffItems: () => plugin.manager.oneOffItems,
				toggleChecked: (key, checked) => plugin.manager.toggleChecked(key, checked),
				isGroupCollapsed: (name) => plugin.manager.isGroupCollapsed(name),
				setGroupCollapsed: (name, collapsed) => plugin.manager.setGroupCollapsed(name, collapsed),
				getKnownCategories: () => plugin.manager.getKnownCategories(),
				syncFromMealPlanNote: () => plugin.manager.syncFromMealPlanNote(),
				addOneOff: (item) => plugin.manager.addOneOff(item),
				updateOneOff: (id, updates) => plugin.manager.updateOneOff(id, updates),
				removeOneOff: (id) => plugin.manager.removeOneOff(id),
				resetChecks: () => plugin.manager.resetChecks(),
				clearAll: async () => { await plugin.manager.clearAll(); },
				subscribeToChanges: (cb) => {
					plugin.manager.on("change", cb);
					return () => plugin.manager.off("change", cb);
				},
				openFile: (path, newTab) => {
					const file = plugin.app.vault.getFileByPath(path);
					if (!file) return;
					const leaf = plugin.app.workspace.getLeaf(newTab ? "tab" : false);
					void leaf.openFile(file);
				},
				openOrCreateNote: async (path) => {
					let file = plugin.app.vault.getFileByPath(path);
					if (!file) file = await plugin.app.vault.create(path, "");
					const leaf = plugin.app.workspace.getLeaf(false);
					await leaf.openFile(file);
				},
				openAddOneOffModal: (existing) => {
					new AddOneOffModal(plugin.app, {
						addOneOff: (item) => plugin.manager.addOneOff(item),
						updateOneOff: (id, updates) => plugin.manager.updateOneOff(id, updates),
						getKnownCategories: () => plugin.manager.getKnownCategories(),
					}, existing).open();
				},
				openExportModal: () => {
					new ExportModal(
						plugin.app,
						() => plugin.manager.groceryItems,
						plugin.settings
					).open();
				},
				openMealPlanView: () => { void plugin.activateMealPlanView(); },
			}),
	);

	plugin.registerView(
		MEAL_PLAN_VIEW_TYPE,
		(leaf) =>
			new MealPlanView(leaf, {
				getSettings: () => plugin.settings,
				getMealPlan: () => plugin.manager.mealPlan,
				addToMealPlan: (path, day) => plugin.manager.addMealPlanEntry(path, day),
				addLeftoversEntry: (day, label) => plugin.manager.addLeftoversEntry(day, label),
				removeFromMealPlan: (id) => plugin.manager.removeFromMealPlan(id),
				rescheduleMealPlanEntry: (id, day) => plugin.manager.rescheduleMealPlanEntry(id, day),
				setMealType: (id, mealType) => plugin.manager.setMealType(id, mealType),
				clearMealPlan: () => plugin.manager.clearMealPlan(),
				subscribeToChanges: (cb) => {
					plugin.manager.on("change", cb);
					return () => plugin.manager.off("change", cb);
				},
				openRecipe: (path) => {
					const file = plugin.app.vault.getFileByPath(path);
					if (!file) return;
					const leaf2 = plugin.app.workspace.getLeaf(false);
					void leaf2.setViewState({ type: RECIPE_VIEW_TYPE, state: { file: path }, active: true });
				},
				editAsMarkdown: () => {
					const path = plugin.settings.mealPlanPath;
					const file = plugin.app.vault.getFileByPath(path);
					if (!file) return;
					const leaf2 = plugin.app.workspace.getLeaf(false);
					void leaf2.setViewState({ type: "markdown", state: { file: path }, active: true });
				},
			}),
	);

	plugin.registerView(
		RECIPE_VIEW_TYPE,
		(leaf) =>
			new RecipeView(leaf, {
				getSettings: () => plugin.settings,
				saveSettings: () => plugin.saveSettings(),
				getMealPlan: () => plugin.manager.mealPlan,
				addToMealPlan: (path, day, meal, contributions) =>
					plugin.manager.addToMealPlan(path, day, meal, contributions),
				removeFromMealPlan: (path) => plugin.manager.removeFromMealPlan(path),
				getGroceryItems: () => plugin.manager.groceryItems,
				removeGroceryByKey: (key) => plugin.manager.removeFromGroceryByKey(key),
				addOneOffItem: (item) => plugin.manager.addOneOff(item),
				removeOneOffItem: (id) => plugin.manager.removeOneOff(id),
				subscribeToChanges: (cb) => {
					plugin.manager.on("change", cb);
					return () => plugin.manager.off("change", cb);
				},
				navigateToGroceryCategory: (cat) => plugin.navigateToGroceryCategory(cat),
				editAsMarkdown: (path) => {
					const leaf2 = plugin.app.workspace.getLeaf(false);
					if (leaf2) void leaf2.setViewState({ type: "markdown", state: { file: path }, active: true });
				},
				openAddToMealPlanModal: (file: TFile, onConfirm) => {
					new AddToMealPlanModal(plugin.app, file, plugin.settings, onConfirm).open();
				},
				openAddToGroceryModal: (file: TFile) => {
					new AddToGroceryModal(
						plugin.app,
						file,
						plugin.settings,
						() => plugin.manager.groceryItems,
						async (toAdd, toRemoveKeys) => {
							const addCount = Object.keys(toAdd).length;
							if (addCount > 0) await plugin.manager.addToGroceryOnly(toAdd, true);
							for (const key of toRemoveKeys) await plugin.manager.removeFromGroceryByKey(key, true);
							const parts: string[] = [];
							if (addCount > 0) parts.push(`${addCount} item${addCount === 1 ? "" : "s"} added`);
							if (toRemoveKeys.length > 0) parts.push(`${toRemoveKeys.length} item${toRemoveKeys.length === 1 ? "" : "s"} removed`);
							if (parts.length > 0) new Notice(parts.join(", ") + ".");
						},
					).open();
				},
				openMarkCookedModal: (file: TFile, onStamp) => {
					new MarkCookedModal(plugin.app, file, plugin.settings, onStamp).open();
				},
				openMealPlanView: () => { void plugin.activateMealPlanView(); },
				removeFromMealPlanById: (id) => plugin.manager.removeFromMealPlan(id),
				openEditMealPlanEntry: (file, entry, onUpdate) => {
					new AddToMealPlanModal(plugin.app, file, plugin.settings,
						(day, meal) => { void onUpdate(day, meal); },
						{ day: entry.day, meal: entry.meal }
					).open();
				},
			}),
	);
}
