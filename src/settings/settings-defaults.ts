/**
 * Default values for all plugin settings, including the built-in grocery
 * category sort order and the default GI dictionary text.
 */
import { RecipeBoxSettings } from "./settings-types";
import { DEFAULT_GI_DICTIONARY } from "../parser/glycemic-dictionary";
import { BUILTIN_MODES } from "../suggester/built-in-strategies";

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
	recipeFolders: ["Recipes"],
	mealPlanPath: "Meal Plan.md",
	groceryListPath: "Grocery List.md",
	ingredientsHeading: "Ingredients",
	instructionsHeading: "Instructions",
	notesHeading: "Notes",

	groupingMode: "category",
	categorySource: "dictionary",
	autoSortCategories: true,
	manualCategoryOrder: DEFAULT_CATEGORY_ORDER,
	categoryOverrides: [],
	autoCollapseCompletedSections: false,

	autoOpenRecipeView: true,
	recipeType: "",
	recipeTypePropertyName: "type",
	nutritionDisplay: "per-serving",
	nutritionSource: "per-serving",
	crossOffWhileCooking: true,
	cleanNoteBody: true,
	useFirstBodyImageWhenFrontmatterEmpty: true,
	desktopRecipeLayout: "two-column",
	desktopTwoColumnSplitRatio: 0.5,

	cookHistoryEnabled: true,
	cookHistoryHeading: "Cook History",
	cookHistoryFrontmatterProperty: "cookHistory",
	lastMadeProperty: "lastMade",
	cookedCountProperty: "cookedCount",
	favoriteProperty: "favorite",

	allergensProperty: "allergens",
	dietProperty: "diet",
	servingsProperty: "servings",
	prepTimeProperty: "prepTime",
	cookTimeProperty: "cookTime",
	totalTimeProperty: "totalTime",
	myAllergens: [],

	showMeatTempWarnings: true,

	imageProperty: "image",
	ratingProperty: "rating",
	caloriesProperty: "calories",
	proteinProperty: "protein",
	fatProperty: "fat",
	carbsProperty: "carbs",

	suggesterModes: BUILTIN_MODES,

	showHighGIWarnings: false,
	giDictionary: DEFAULT_GI_DICTIONARY,

	timersEnabled: true,
	timerAutoStart: false,
	timerCompactDisplay: false,
	timerRangeDefault: "max",

	autoAddOnSync: false,
	autoAddTagFilter: "",

	mealTypeNotation: "tag",
	mealTypeFieldName: "meal",

	importerTemplatePath: "",
	importerDefaultFolder: "Recipes",
	downloadImagesOnImport: true,

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
	showTagsInHeader: true,
	prefixTagsWithHash: true,
	showFullTagPath: false,

	exportFolder: "Recipe Exports",
	recipeExportDefaultFormat: "plain-markdown",
	recipeExportIncludeCookHistoryDefault: false,
	recipeExportIncludeImagesDefault: false,

	shareServerUrl: "https://share.arcanerecipes.com",
	shareDataProperty: "recipe-share",
	userGuid: "",
	userShortId: "",

	state: {
		mealPlan: [],
		groceryItems: [],
		collapsedSections: {},
		groceryContributions: {},
	},
};
