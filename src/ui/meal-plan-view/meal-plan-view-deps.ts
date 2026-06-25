/**
 * Dependency interface injected into MealPlanView, decoupling the view from
 * the live plugin instance.
 */
import { TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";

export interface MealPlanViewDeps {
	getSettings: () => RecipeBoxSettings;
	getMealPlan: () => MealPlanEntry[];
	addToMealPlan: (path: string, day?: string) => Promise<string>;
	addLeftoversEntry: (day?: string, label?: string) => Promise<string>;
	openAddToMealPlanModal: (file: TFile, prefill?: { day?: string }) => void;
	removeFromMealPlan: (id: string) => Promise<void>;
	rescheduleMealPlanEntry: (id: string, newDay: string | undefined) => Promise<void>;
	setMealType: (id: string, mealType: string | undefined) => Promise<void>;
	clearMealPlan: (alsoRemoveFromGrocery: boolean) => Promise<number>;
	subscribeToChanges: (cb: () => void) => () => void;
	openRecipe: (path: string) => void;
	editAsMarkdown: () => void;
}
