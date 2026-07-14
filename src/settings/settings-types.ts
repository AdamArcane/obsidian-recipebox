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

export interface RecipeBoxSettings {
	// Recipe location & structure
	recipeFolders: string[];
	mealPlanPath: string;
	groceryListPath: string;
	ingredientsHeading: string;
	instructionsHeading: string;

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
