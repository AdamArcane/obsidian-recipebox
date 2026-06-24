import { TFile } from "obsidian";
import { ContributionMap, GroceryItem, MealPlanEntry, OneOffItem } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export type CookedImageResult =
	| { kind: "vault-file"; file: TFile }
	| { kind: "upload"; filename: string; data: ArrayBuffer };

export interface RecipeViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getMealPlan: () => MealPlanEntry[];
	addToMealPlan: (recipePath: string, day?: string, meal?: string, contributions?: ContributionMap) => Promise<void>;
	removeFromMealPlan: (path: string) => Promise<void>;
	getGroceryItems: () => GroceryItem[];
	removeGroceryByKey: (key: string) => Promise<void>;
	addOneOffItem: (item: Omit<OneOffItem, "id">) => Promise<void>;
	removeOneOffItem: (id: string) => Promise<void>;
	subscribeToChanges: (cb: () => void) => () => void;
	navigateToGroceryCategory: (category: string) => Promise<void>;
	editAsMarkdown: (path: string) => void;
	openAddToMealPlanModal: (file: TFile, onConfirm: (day?: string, meal?: string, contributions?: ContributionMap) => void) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openMarkCookedModal: (file: TFile, onStamp: (date: string, notes: string, image: CookedImageResult | null) => void) => void;
	openMealPlanView: () => void;
	removeFromMealPlanById: (id: string) => Promise<void>;
	openEditMealPlanEntry: (file: TFile, entry: MealPlanEntry, onUpdate: (day?: string, meal?: string) => Promise<void>) => void;
}
