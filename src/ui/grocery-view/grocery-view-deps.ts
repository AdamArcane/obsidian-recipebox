/**
 * Dependency interface injected into GroceryView, decoupling the view from
 * the live plugin instance and enabling isolated testing.
 */
import { OneOffItem, GroceryItem, MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export interface GroceryViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getGroceryItems: () => GroceryItem[];
	getMealPlan: () => MealPlanEntry[];
	getOneOffItems: () => OneOffItem[];
	toggleChecked: (key: string, checked: boolean) => Promise<void>;
	isGroupCollapsed: (name: string) => boolean;
	setGroupCollapsed: (name: string, collapsed: boolean) => Promise<void>;
	getKnownCategories: () => string[];
	syncFromMealPlanNote: () => Promise<void>;
	addOneOff: (item: Omit<OneOffItem, "id">) => Promise<void>;
	updateOneOff: (id: string, updates: Partial<Omit<OneOffItem, "id">>) => Promise<void>;
	removeOneOff: (id: string) => Promise<void>;
	resetChecks: () => Promise<void>;
	clearAll: () => Promise<void>;
	subscribeToChanges: (cb: () => void) => () => void;
	openFile: (path: string, newTab: boolean) => void;
	openOrCreateNote: (path: string) => Promise<void>;
	openAddOneOffModal: (existingItem?: OneOffItem) => void;
	openExportModal: () => void;
	openMealPlanView: () => void;
}
