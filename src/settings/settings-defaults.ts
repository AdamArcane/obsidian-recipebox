/**
 * Default values for all plugin settings, including the built-in grocery
 * category sort order and the default GI dictionary text.
 */
import { RecipeBoxSettings } from "./settings-types";
import { DEFAULT_GI_DICTIONARY } from "../parser/glycemic-dictionary";

export const DEFAULT_CATEGORY_ORDER: string[] = [
	"Produce",
	"Herb",
	"Meat",
	"Seafood",
	"Dairy",
	"Cheese",
	"Egg",
	"Bread",
	"Pasta",
	"Grain",
	"Canned",
	"Broth",
	"Sauce",
	"Condiment",
	"Oil",
	"Seasoning",
	"Baking",
	"Nuts & Seeds",
	"Snack",
	"Frozen",
	"Beverage",
	"Alcohol",
	"Household",
	"Other",
];

export const DEFAULT_SETTINGS: RecipeBoxSettings = {
	recipeFolders: [],
	mealPlanPath: "Meal Plan.md",
	groceryListPath: "Grocery List.md",
	ingredientsHeading: "Ingredients",
	instructionsHeading: "Instructions",

	groupingMode: "category",
	categorySource: "dictionary",
	autoSortCategories: true,
	manualCategoryOrder: DEFAULT_CATEGORY_ORDER,
	categoryOverrides: [],
	autoCollapseCompletedSections: false,

	autoOpenRecipeView: true,
	recipeType: "recipe",
	recipeTypePropertyName: "type",
	nutritionDisplay: "per-serving",
	nutritionSource: "per-serving",
	crossOffWhileCooking: true,
	showMarkCookedButton: true,
	stripBodyTitle: true,
	stripHeroImage: true,

	cookHistoryEnabled: false,
	cookHistoryHeading: "Cook History",
	cookHistoryStorage: "note",
	cookHistoryFrontmatterProperty: "cookHistory",

	trackLastMade: true,
	lastMadeProperty: "lastMade",
	trackCookedCount: true,

	allergensProperty: "allergens",
	myAllergens: [],

	showMeatTempWarnings: true,

	ratingProperty: "rating",
	caloriesProperty: "calories",
	proteinProperty: "protein",
	fatProperty: "fat",
	carbsProperty: "carbs",

	suggestionDayWindow: 14,
	suggestionCount: 5,

	showHighGIWarnings: false,
	giDictionary: DEFAULT_GI_DICTIONARY,

	timersEnabled: true,
	timerAutoStart: false,
	timerCompactDisplay: false,
	timerRangeDefault: "max",
	timerMinuteIncrement: 1,

	autoAddOnSync: false,
	autoAddTagFilter: "",

	mealTypeNotation: "tag",
	mealTypeFieldName: "meal",

	importerTemplatePath: "",
	importerDefaultFolder: "",

	headerBadges: [
		{
			type: "badge",
			property: "diet",
			label: "Diet",
			icon: "leaf",
			color: "green",
			valueType: "auto",
			splitArray: true,
			enabled: true,
			builtin: true,
		},
		{
			type: "badge",
			property: "prepTime",
			label: "Prep",
			icon: "clock",
			color: "default",
			valueType: "minutes",
			splitArray: false,
			enabled: true,
			builtin: true,
		},
		{
			type: "badge",
			property: "cookTime",
			label: "Cook",
			icon: "clock",
			color: "default",
			valueType: "minutes",
			splitArray: false,
			enabled: true,
			builtin: true,
		},
		{
			type: "badge",
			property: "total",
			label: "Total",
			icon: "clock",
			color: "default",
			valueType: "minutes",
			splitArray: false,
			enabled: true,
			formula: "(prepTime || 0) + (cookTime || 0) || null",
			builtin: true,
		},
		{
			type: "badge",
			property: "lastMade",
			label: "Last made",
			icon: "calendar-check",
			color: "default",
			valueType: "auto",
			splitArray: false,
			enabled: true,
			builtin: true,
		},
	],
	showTagsInHeader: false,
	prefixTagsWithHash: true,
	showFullTagPath: false,

	state: {
		mealPlan: [],
		groceryItems: [],
		collapsedSections: {},
		groceryContributions: {},
	},
};
