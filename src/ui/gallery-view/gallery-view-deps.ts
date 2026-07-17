/**
 * Dependency interface injected into GalleryView, decoupling the view from
 * the live plugin instance.
 */
import { TFile } from "obsidian";
import { RecipeBoxSettings, GallerySavedState } from "../../settings/settings-types";

export interface GalleryViewDeps {
	getSettings: () => RecipeBoxSettings;
	saveSettings: () => Promise<void>;
	getAllRecipeNotes: () => TFile[];
	saveGalleryState: (state: GallerySavedState) => Promise<void>;
	subscribeToChanges: (cb: () => void) => () => void;
	openRecipe: (path: string) => void;
	openAddToMealPlanModal: (file: TFile) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openShareModal: (file: TFile) => void;
}
