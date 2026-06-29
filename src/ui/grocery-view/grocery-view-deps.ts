/**
 * Dependency interface injected into GroceryView, decoupling the view from
 * the live plugin instance and enabling isolated testing.
 */
import { GroceryItemEntry, GroceryItem, MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export interface GroceryViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getGroceryItems: () => GroceryItem[];
	getMealPlan: () => MealPlanEntry[];
	getGroceryItemEntries: () => GroceryItemEntry[];
	toggleChecked: (key: string, checked: boolean) => Promise<void>;
	isGroupCollapsed: (name: string) => boolean;
	setGroupCollapsed: (name: string, collapsed: boolean) => Promise<void>;
	getKnownCategories: () => string[];
	syncFromMealPlanNote: () => Promise<void>;
	addGroceryItem: (item: Omit<GroceryItemEntry, "id">) => Promise<void>;
	updateGroceryItem: (id: string, updates: Partial<Omit<GroceryItemEntry, "id">>) => Promise<void>;
	removeGroceryItem: (id: string) => Promise<void>;
	removeFromGroceryByKey: (key: string) => Promise<void>;
	setAllChecked: (checked: boolean) => Promise<void>;
	clearGroceryOnly: () => Promise<void>;
	subscribeToChanges: (cb: () => void) => () => void;
	openFile: (path: string, newTab: boolean) => void;
	openOrCreateNote: (path: string) => Promise<void>;
	openAddGroceryItemModal: (existingItem?: GroceryItemEntry) => void;
	openExportModal: () => void;
	openMealPlanView: () => void;
}
