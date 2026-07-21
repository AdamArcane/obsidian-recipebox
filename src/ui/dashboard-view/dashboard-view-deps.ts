/**
 * Dependency interface injected into DashboardView, decoupling the view from
 * the live plugin instance. See dashboard-spec.md section 2.2.
 */
import { TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { MealPlanEntry, GroceryItem } from "../../types";

export interface DashboardViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getAllRecipeNotes: () => TFile[];
	getMealPlan: () => MealPlanEntry[];
	getGroceryItems: () => GroceryItem[];
	subscribeToChanges: (cb: () => void) => () => void;

	// navigation
	openGroceryView: () => void;
	openMealPlanView: () => void;
	openGalleryView: () => void;
	openRecipe: (file: TFile) => void;
	searchRecipes: (query: string) => void;

	// actions surfaced in the quick-actions row
	openImportModal: () => void;
	openAddGroceryItemModal: () => void;
	openSuggestMealModal: () => void;

	// grocery preview
	toggleChecked: (key: string, checked: boolean) => void;

	// gallery card actions, forwarded straight to renderGalleryCard
	openAddToMealPlanModal: (file: TFile) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openShareModal: (file: TFile) => void;

	// shared-recipes preview
	unshareRecipe: (file: TFile) => Promise<void>;
}
