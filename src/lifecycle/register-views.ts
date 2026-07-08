/**
 * Registers the three plugin views (GroceryView, MealPlanView, RecipeView) with
 * Obsidian and wires each view's dependency interface to the live plugin instance.
 */
import { Notice, TFile } from "obsidian";
import RecipeBoxPlugin from "../main";
import { GroceryView, GROCERY_VIEW_TYPE } from "../ui/grocery-view";
import { RecipeView, RECIPE_VIEW_TYPE } from "../ui/recipe-view/recipe-view";
import { MealPlanView, MEAL_PLAN_VIEW_TYPE } from "../ui/meal-plan-view/meal-plan-view";
import { AddToMealPlanModal } from "../ui/modals/add-to-meal-plan-modal";
import { AddToGroceryModal } from "../ui/modals/add-to-grocery-modal";
import { MarkCookedModal } from "../ui/modals/mark-cooked-modal";
import { AddGroceryItemModal } from "../ui/modals/add-grocery-item-modal";
import { ExportModal } from "../ui/modals/export-modal";
import { resolveNotePath } from "../utils/vault-notes";

export function registerViews(plugin: RecipeBoxPlugin): void {
	plugin.registerView(
		GROCERY_VIEW_TYPE,
		(leaf) =>
			new GroceryView(leaf, {
				getSettings: () => plugin.settings,
				saveSettings: () => plugin.saveSettings(),
				getGroceryItems: () => plugin.manager.groceryItems,
				getMealPlan: () => plugin.manager.mealPlan,
				getGroceryItemEntries: () => plugin.manager.groceryItemEntries,
				toggleChecked: (key, checked) => plugin.manager.toggleChecked(key, checked),
				isGroupCollapsed: (name) => plugin.manager.isGroupCollapsed(name),
				setGroupCollapsed: (name, collapsed) => plugin.manager.setGroupCollapsed(name, collapsed),
				getKnownCategories: () => plugin.manager.getKnownCategories(),
				syncFromMealPlanNote: () => plugin.manager.syncFromMealPlanNote(),
				addGroceryItem: (item) => plugin.manager.addGroceryItem(item),
				updateGroceryItem: (id, updates) => plugin.manager.updateGroceryItem(id, updates),
				removeGroceryItem: (id) => plugin.manager.removeGroceryItem(id),
				removeFromGroceryByKey: (key) => plugin.manager.removeFromGroceryByKey(key),
				setAllChecked: (checked) => plugin.manager.setAllChecked(checked),
				clearGroceryOnly: () => plugin.manager.clearGroceryOnly(),
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
				openAddGroceryItemModal: (existing) => {
					new AddGroceryItemModal(plugin.app, {
						addGroceryItem: (item) => plugin.manager.addGroceryItem(item),
						updateGroceryItem: (id, updates) => plugin.manager.updateGroceryItem(id, updates),
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
				addCustomMealEntry: (label, day, meal, isLeftovers) => plugin.manager.addCustomMealEntry(label, day, meal, isLeftovers),
				editCustomMealEntry: (id, updates) => plugin.manager.editCustomMealEntry(id, updates),
				removeFromMealPlan: (id) => plugin.manager.removeFromMealPlan(id),
				rescheduleMealPlanEntry: (id, day) => plugin.manager.rescheduleMealPlanEntry(id, day),
				setMealType: (id, mealType) => plugin.manager.setMealType(id, mealType),
				clearMealPlan: (alsoRemove) => plugin.manager.clearMealPlan(alsoRemove),
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
					const path = resolveNotePath(plugin.settings.mealPlanPath);
					const file = plugin.app.vault.getFileByPath(path);
					if (!file) return;
					const leaf2 = plugin.app.workspace.getLeaf(false);
					void leaf2.setViewState({ type: "markdown", state: { file: path }, active: true });
				},
				openAddToMealPlanModal: (file, prefill) => {
					new AddToMealPlanModal(
						plugin.app,
						{ kind: "recipe", file },
						plugin.settings,
						(day, meal, contributions, isLeftovers) => {
							void plugin.manager.addToMealPlan(file.path, day, meal, contributions ?? {}, isLeftovers);
						},
						prefill,
					).open();
				},
				openAddCustomMealModal: (label, day, editingEntry) => {
					new AddToMealPlanModal(
						plugin.app,
						{ kind: "custom", label: editingEntry?.label ?? label },
						plugin.settings,
						(d, meal, _contributions, isLeftovers, updatedLabel) => {
							// Editing an existing card must update that entry in place, not create
							// a second one alongside it (see: editMode/duplicate-entry bug fix).
							if (editingEntry) void plugin.manager.editCustomMealEntry(editingEntry.id, { label: updatedLabel, day: d, meal, isLeftovers });
							else void plugin.manager.addCustomMealEntry(updatedLabel ?? label, d, meal, isLeftovers);
						},
						{ day: editingEntry?.day ?? day, meal: editingEntry?.meal, isLeftovers: editingEntry?.isLeftovers, isEdit: !!editingEntry },
					).open();
				},
				openEditEntryModal: (entry) => {
					if (entry.recipePath) {
						const file = plugin.app.vault.getFileByPath(entry.recipePath);
						if (!file) return;
						new AddToMealPlanModal(
							plugin.app,
							{ kind: "recipe", file },
							plugin.settings,
							(day, meal, contributions, isLeftovers) => {
								void plugin.manager.addToMealPlan(file.path, day, meal, contributions ?? {}, isLeftovers);
							},
							{ day: entry.day, meal: entry.meal, isLeftovers: entry.isLeftovers, isEdit: true },
						).open();
					} else {
						// Custom meal: re-use the existing path which handles label editing
						new AddToMealPlanModal(
							plugin.app,
							{ kind: "custom", label: entry.label ?? "" },
							plugin.settings,
							(d, meal, _contributions, isLeftovers, updatedLabel) => {
								void plugin.manager.editCustomMealEntry(entry.id, { label: updatedLabel, day: d, meal, isLeftovers });
							},
							{ day: entry.day, meal: entry.meal, isLeftovers: entry.isLeftovers, isEdit: true },
						).open();
					}
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
				addToMealPlan: (path, day, meal, contributions, isLeftovers) =>
					plugin.manager.addToMealPlan(path, day, meal, contributions, isLeftovers),
				removeFromMealPlan: (path) => plugin.manager.removeFromMealPlan(path),
				getGroceryItems: () => plugin.manager.groceryItems,
				removeGroceryByKey: (key) => plugin.manager.removeFromGroceryByKey(key),
				addGroceryItem: (item) => plugin.manager.addGroceryItem(item),
				removeGroceryItem: (id) => plugin.manager.removeGroceryItem(id),
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
					new AddToMealPlanModal(plugin.app, { kind: "recipe", file }, plugin.settings, onConfirm).open();
				},
				openAddToGroceryModal: (file: TFile) => {
					new AddToGroceryModal(
						plugin.app,
						file,
						plugin.settings,
						() => plugin.manager.groceryItems,
						async (toAdd, toRemoveKeys) => {
							const addCount = Object.keys(toAdd).length;
							if (addCount > 0) await plugin.manager.addToGroceryOnly(toAdd, { kind: "recipe", path: file.path }, true);
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
					new AddToMealPlanModal(
						plugin.app,
						{ kind: "recipe", file },
						plugin.settings,
						(day, meal, _contributions, isLeftovers) => { void onUpdate(day, meal, isLeftovers); },
						{ day: entry.day, meal: entry.meal, isLeftovers: entry.isLeftovers, isEdit: true }
					).open();
				},
			}),
	);
}
