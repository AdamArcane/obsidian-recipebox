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
	// Card 3-dot actions menu -- each is just a new entry point to an existing
	// modal; the manager wiring lives in register-views.ts, same as the
	// recipe view's equivalents, so no mutation logic is duplicated here.
	openAddToMealPlanModal: (file: TFile) => void;
	openAddToGroceryModal: (file: TFile) => void;
	openShareModal: (file: TFile) => void;
}
