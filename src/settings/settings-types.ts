/**
 * TypeScript types and interfaces for all plugin settings, including the
 * persisted runtime state (meal plan, one-off items, collapsed sections).
 */
import {
	GroupingMode,
	CategorySource,
	CategoryOverride,
	MealPlanEntry,
	OneOffItem,
	CustomBadge,
} from "../types";

export type NutritionDisplay = "per-serving" | "total";
export type CookHistoryStorage = "note" | "frontmatter" | "both";
export type MealTypeNotation = "tag" | "dataview" | "text";
export type { CategorySource } from "../types";
export type NutritionSource = "recipe-total" | "per-serving";

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
	showMarkCookedButton: boolean;
	stripBodyTitle: boolean;
	stripHeroImage: boolean;

	// Cook history tracking
	cookHistoryEnabled: boolean;
	cookHistoryHeading: string;
	cookHistoryStorage: CookHistoryStorage;
	cookHistoryFrontmatterProperty: string;

	// Cooked stats
	trackLastMade: boolean;
	lastMadeProperty: string;
	trackCookedCount: boolean;

	// Allergens
	allergensProperty: string;
	myAllergens: string[];

	// Food safety
	showMeatTempWarnings: boolean;

	// Nutrition property names
	ratingProperty: string;
	caloriesProperty: string;
	proteinProperty: string;
	fatProperty: string;
	carbsProperty: string;

	// Meal recommender
	suggestionDayWindow: number;
	suggestionCount: number;

	// Diabetic mode
	showHighGIWarnings: boolean;
	giDictionary: string;

	// Timers
	timersEnabled: boolean;
	timerAutoStart: boolean;
	timerCompactDisplay: boolean;
	timerRangeDefault: "min" | "max";
	timerMinuteIncrement: number;

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

	// Persisted runtime state
	state: {
		mealPlan: MealPlanEntry[];
		oneOffItems: OneOffItem[];
		collapsedSections: Record<string, boolean>;
	};
}
