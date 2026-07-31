/**
 * TypeScript types and interfaces for all plugin settings, including the
 * persisted runtime state (meal plan, grocery items, collapsed sections).
 */
import {
	GroupingMode,
	CategorySource,
	CategoryOverride,
	GroceryContributionSource,
	MealPlanEntry,
	GroceryItemEntry,
	CustomBadge,
} from "../types";
import type { SuggesterMode } from "../suggester/strategy-types";

export type NutritionDisplay = "per-serving" | "total";
export type MealTypeNotation = "tag" | "dataview" | "text";
export type { CategorySource } from "../types";
export type NutritionSource = "recipe-total" | "per-serving";
export type DesktopRecipeLayout = "classic" | "two-column";
// PDF lands once its exporter is built.
export type RecipeExportFormat = "plain-markdown" | "importable-markdown" | "json" | "json-ld";
export type GallerySortField =
	| "title"
	| "date-added"
	| "date-modified"
	| "last-cooked"
	| "rating"
	| "times-cooked";
export type GallerySortDirection = "asc" | "desc";
export type DashboardActivityRangeWeeks = 2 | 4 | 8 | 12;

// All gallery filter/sort state travels together as one persisted unit (see
// "settings that always travel together get one toggle" convention) rather
// than as separate top-level settings keys.
export interface GallerySavedState {
	sortField: GallerySortField;
	sortDirection: GallerySortDirection;
	folder: string | null;
	favoriteOnly: boolean;
	tag: string | null;
	minRating: number;
	neverCooked: boolean;
	excludeAllergens: boolean;
	search: string;
}

export interface RecipeBoxSettings {
	// Recipe location & structure
	recipeFolders: string[];
	// Folder-note style navigation: clicking a recipe folder in the file
	// explorer (or Notebook Navigator) opens the gallery instead of just
	// expanding it. See src/integrations/ for the adapters that read these.
	openGalleryOnFolderClick: boolean;
	openGalleryOnFolderClickSubfolders: boolean;
	mealPlanPath: string;
	groceryListPath: string;
	ingredientsHeading: string;
	instructionsHeading: string;
	notesHeading: string;
	enableDashboard: boolean;

	// Grocery list display
	groupingMode: GroupingMode;
	categorySource: CategorySource;
	autoSortCategories: boolean;
	manualCategoryOrder: string[];
	categoryOverrides: CategoryOverride[];
	autoCollapseCompletedSections: boolean;

	// Recipe view behavior
	autoOpenRecipeView: boolean;
	recipeType: string;
	recipeTypePropertyName: string;
	nutritionDisplay: NutritionDisplay;
	nutritionSource: NutritionSource;
	crossOffWhileCooking: boolean;
	cleanNoteBody: boolean;
	useFirstBodyImageWhenFrontmatterEmpty: boolean;
	// Vault path, wikilink, or URL -- same value format as a frontmatter image
	// property. Used by recipe view and gallery when no real image is found.
	// Empty string disables the fallback. Never applied to public shares.
	defaultRecipeImage: string;
	desktopRecipeLayout: DesktopRecipeLayout;
	desktopTwoColumnSplitRatio: number;

	// Cook history tracking
	cookHistoryEnabled: boolean;
	cookHistoryHeading: string;
	cookHistoryFrontmatterProperty: string;
	lastMadeProperty: string;
	cookedCountProperty: string;
	favoriteProperty: string;

	// Allergens
	allergensProperty: string;
	dietProperty: string;
	servingsProperty: string;
	prepTimeProperty: string;
	cookTimeProperty: string;
	totalTimeProperty: string;
	myAllergens: string[];

	// Food safety
	showMeatTempWarnings: boolean;

	// Nutrition property names
	imageProperty: string;
	ratingProperty: string;
	caloriesProperty: string;
	proteinProperty: string;
	fatProperty: string;
	carbsProperty: string;

	// Meal suggester
	suggesterModes: SuggesterMode[];

	// Ingredient parsing
	recipeLocale: string;
	unitAliases: string;

	// Diabetic mode
	showHighGIWarnings: boolean;
	giDictionary: string;

	// Timers
	timersEnabled: boolean;
	timerAutoStart: boolean;
	timerCompactDisplay: boolean;
	timerRangeDefault: "min" | "max";

	// Meal-plan-to-grocery sync
	autoAddOnSync: boolean;
	autoAddTagFilter: string;

	// Meal type notation in the meal plan note
	mealTypeNotation: MealTypeNotation;
	mealTypeFieldName: string;

	// Importer
	importerTemplatePath: string;
	importerDefaultFolder: string;
	downloadImagesOnImport: boolean;

	// Header badges
	headerBadges: CustomBadge[];
	showTagsInHeader: boolean;
	prefixTagsWithHash: boolean;
	showFullTagPath: boolean;

	// Export -- shared folder plus per-format defaults, so every export
	// feature (recipe, grocery, future meal plan) configures "where things
	// go" in one place instead of accumulating its own scattered setting.
	exportFolder: string;
	recipeExportDefaultFormat: RecipeExportFormat;
	recipeExportIncludeCookHistoryDefault: boolean;
	recipeExportIncludeImagesDefault: boolean;

	// Gallery view
	gallerySavedState: GallerySavedState;

	// Dashboard view -- changed only via the dashboard's own range dropdown
	// (see dashboard-spec.md section 13.2), not a settings-tab field, so it
	// doesn't reopen the "no new settings for v1" call the way a user-facing
	// settings-tab control would.
	dashboardActivityRangeWeeks: DashboardActivityRangeWeeks;

	// Recipe sharing -- shareServerUrl is the base URL of the server used for sharing recipes.
	shareServerUrl: string;
	// The four share values (slug/token/created/expires) are never read or
	// written independently, so per convention ("settings that always travel
	// together get one toggle") they live in a single nested frontmatter
	// property rather than four flat ones.
	shareDataProperty: string;
	// Plugin-level identity, not per-recipe -- generated once on first share
	// and reused for every share after. Never regenerated, never shown.
	userGuid: string;
	userShortId: string;

	// Persisted runtime state
	state: {
		mealPlan: MealPlanEntry[];
		groceryItems: GroceryItemEntry[];
		collapsedSections: Record<string, boolean>;
		groceryContributions: Record<string, Array<{ source: GroceryContributionSource; quantity: number | null }>>;
		lastUsedModeId?: string;
	};
}
