/**
 * Dependency interface injected into RecipeView, decoupling the view from the
 * live plugin instance. Also exports the CookedImageResult union type.
 */
import { TFile } from "obsidian";
import { ContributionMap, GroceryItem, GroceryItemEntry, MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export type CookedImageResult =
	| { kind: "vault-file"; file: TFile }
	| { kind: "upload"; filename: string; data: ArrayBuffer };

export interface RecipeViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getMealPlan: () => MealPlanEntry[];
	addToMealPlan: (recipePath: string, day?: string, meal?: string, contributions?: ContributionMap, isLeftovers?: boolean) => Promise<void>;
	removeFromMealPlan: (path: string) => Promise<void>;
	getGroceryItems: () => GroceryItem[];
	removeGroceryByKey: (key: string) => Promise<void>;
	addGroceryItem: (item: Omit<GroceryItemEntry, "id">) => Promise<void>;
	removeGroceryItem: (id: string) => Promise<void>;
	subscribeToChanges: (cb: () => void) => () => void;
	navigateToGroceryCategory: (category: string) => Promise<void>;
	editAsMarkdown: (path: string) => void;
	openAddToMealPlanModal: (file: TFile, onConfirm: (day?: string, meal?: string, contributions?: ContributionMap, isLeftovers?: boolean) => void) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openMarkCookedModal: (file: TFile, onStamp: (date: string, notes: string, image: CookedImageResult | null) => void) => void;
	openMealPlanView: () => void;
	removeFromMealPlanById: (id: string) => Promise<void>;
	openEditMealPlanEntry: (file: TFile, entry: MealPlanEntry, onUpdate: (day?: string, meal?: string, isLeftovers?: boolean) => Promise<void>) => void;
}
