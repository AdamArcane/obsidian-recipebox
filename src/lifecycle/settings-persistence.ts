/**
 * Deserialises raw plugin data into a fully-typed RecipeBoxSettings object,
 * applying defaults and validation for every field so no corrupt value reaches the UI.
 */
import {
	BadgeColor,
	BadgeType,
	BadgeValueType,
	CategoryOverride,
	CustomBadge,
	GroceryContributionSource,
	GroupingMode,
	MealPlanEntry,
	GroceryItemEntry,
} from "../types";
import { generateEntryId } from "../utils/date";
import {
	CategorySource,
	NutritionDisplay,
	NutritionSource,
	RecipeBoxSettings,
} from "../settings/settings-types";
import { DEFAULT_SETTINGS } from "../settings/settings-defaults";

// ── primitive validators ──────────────────────────────────────────────────────

function str(val: unknown, fallback: string): string {
	return typeof val === "string" ? val : fallback;
}

function num(val: unknown, fallback: number, min?: number, max?: number): number {
	if (typeof val !== "number" || !isFinite(val)) return fallback;
	if (min !== undefined && val < min) return fallback;
	if (max !== undefined && val > max) return fallback;
	return val;
}

function bool(val: unknown, fallback: boolean): boolean {
	return typeof val === "boolean" ? val : fallback;
}

function oneOf<T>(val: unknown, options: readonly T[], fallback: T): T {
	return (options as unknown[]).includes(val) ? (val as T) : fallback;
}

function strArr(val: unknown, fallback: string[]): string[] {
	if (!Array.isArray(val)) return fallback;
	return (val as unknown[]).filter((x): x is string => typeof x === "string");
}

// ── complex type validators ───────────────────────────────────────────────────

function validateOverride(raw: unknown): CategoryOverride | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	if (typeof o.match !== "string" || !o.match.trim()) return null;
	if (typeof o.category !== "string" || !o.category.trim()) return null;
	return { match: o.match.trim(), category: o.category.trim() };
}

function validateMealPlanEntry(raw: unknown): MealPlanEntry | null {
	if (!raw || typeof raw !== "object") return null;
	const e = raw as Record<string, unknown>;
	if (typeof e.recipePath !== "string") return null;
	// leftovers entries have an empty recipePath but must have a label
	if (!e.recipePath && typeof e.label !== "string") return null;
	const contributions =
		e.contributions && typeof e.contributions === "object" && !Array.isArray(e.contributions)
			? (e.contributions as MealPlanEntry["contributions"])
			: {};
	return {
		// migrate old entries that predate the id field
		id: typeof e.id === "string" && e.id ? e.id : generateEntryId(),
		recipePath: e.recipePath,
		label: typeof e.label === "string" ? e.label : undefined,
		day: typeof e.day === "string" ? e.day : undefined,
		meal: typeof e.meal === "string" ? e.meal : undefined,
		addedDate: str(e.addedDate, new Date().toISOString()),
		contributions,
		autoAddProcessed: typeof e.autoAddProcessed === "boolean" ? e.autoAddProcessed : undefined,
	};
}

function validateGroceryItemEntry(raw: unknown): GroceryItemEntry | null {
	if (!raw || typeof raw !== "object") return null;
	const i = raw as Record<string, unknown>;
	if (typeof i.id !== "string" || !i.id) return null;
	if (typeof i.name !== "string" || !i.name.trim()) return null;
	return {
		id: i.id,
		name: i.name.trim(),
		quantity: typeof i.quantity === "number" ? i.quantity : null,
		unit: str(i.unit, ""),
		categoryOverride: typeof i.categoryOverride === "string" ? i.categoryOverride : null,
	};
}

function validateBadge(raw: unknown): CustomBadge | null {
	if (!raw || typeof raw !== "object") return null;
	const b = raw as Record<string, unknown>;
	return {
		type: oneOf<BadgeType>(b.type, ["badge", "separator", "newline"], "badge"),
		property: str(b.property, ""),
		label: str(b.label, ""),
		icon: typeof b.icon === "string" ? b.icon : undefined,
		color: oneOf<BadgeColor>(b.color, ["default", "green", "blue", "purple", "yellow", "red"], "default"),
		valueType: oneOf<BadgeValueType>(b.valueType, ["auto", "minutes"], "auto"),
		prefix: typeof b.prefix === "string" ? b.prefix : undefined,
		suffix: typeof b.suffix === "string" ? b.suffix : undefined,
		splitArray: bool(b.splitArray, false),
		enabled: bool(b.enabled, true),
		hideLabel: typeof b.hideLabel === "boolean" ? b.hideLabel : undefined,
		formula: typeof b.formula === "string" ? b.formula : undefined,
		builtin: bool(b.builtin, false),
	};
}

// ── public API ────────────────────────────────────────────────────────────────

export function mergeSettings(raw: unknown): RecipeBoxSettings {
	const d = DEFAULT_SETTINGS;
	if (!raw || typeof raw !== "object") return { ...d };
	const r = raw as Record<string, unknown>;

	const state = r.state && typeof r.state === "object" ? (r.state as Record<string, unknown>) : {};
	const collapsedRaw =
		state.collapsedSections && typeof state.collapsedSections === "object"
			? (state.collapsedSections as Record<string, unknown>)
			: {};
	const collapsedSections: Record<string, boolean> = {};
	for (const [k, v] of Object.entries(collapsedRaw)) {
		if (typeof v === "boolean") collapsedSections[k] = v;
	}

	return {
		recipeFolders: strArr(r.recipeFolders, d.recipeFolders),
		mealPlanPath: str(r.mealPlanPath, d.mealPlanPath),
		groceryListPath: str(r.groceryListPath, d.groceryListPath),
		ingredientsHeading: str(r.ingredientsHeading, d.ingredientsHeading),
		instructionsHeading: str(r.instructionsHeading, d.instructionsHeading),

		groupingMode: oneOf<GroupingMode>(r.groupingMode, ["category", "recipe", "source", "none"], d.groupingMode),
		categorySource: oneOf<CategorySource>(r.categorySource, ["dictionary", "tag", "tag-then-dictionary"], d.categorySource),
		autoSortCategories: bool(r.autoSortCategories, d.autoSortCategories),
		manualCategoryOrder: strArr(r.manualCategoryOrder, d.manualCategoryOrder),
		categoryOverrides: Array.isArray(r.categoryOverrides)
			? (r.categoryOverrides as unknown[]).map(validateOverride).filter((x): x is CategoryOverride => x !== null)
			: d.categoryOverrides,
		autoCollapseCompletedSections: bool(r.autoCollapseCompletedSections, d.autoCollapseCompletedSections),

		autoOpenRecipeView: bool(r.autoOpenRecipeView, d.autoOpenRecipeView),
		recipeType: str(r.recipeType, d.recipeType),
		recipeTypePropertyName: str(r.recipeTypePropertyName, d.recipeTypePropertyName),
		nutritionDisplay: oneOf<NutritionDisplay>(r.nutritionDisplay, ["per-serving", "total"], d.nutritionDisplay),
		nutritionSource: oneOf<NutritionSource>(r.nutritionSource, ["recipe-total", "per-serving"], d.nutritionSource),
		crossOffWhileCooking: bool(r.crossOffWhileCooking, d.crossOffWhileCooking),
		showMarkCookedButton: bool(r.showMarkCookedButton, d.showMarkCookedButton),
		stripBodyTitle: bool(r.stripBodyTitle, d.stripBodyTitle),
		stripHeroImage: bool(r.stripHeroImage, d.stripHeroImage),

		cookHistoryEnabled: bool(r.cookHistoryEnabled, d.cookHistoryEnabled),
		cookHistoryHeading: str(r.cookHistoryHeading, d.cookHistoryHeading),
		cookHistoryStorage: oneOf<"note" | "frontmatter" | "both">(r.cookHistoryStorage, ["note", "frontmatter", "both"], d.cookHistoryStorage),
		cookHistoryFrontmatterProperty: str(r.cookHistoryFrontmatterProperty, d.cookHistoryFrontmatterProperty),
		trackLastMade: bool(r.trackLastMade, d.trackLastMade),
		lastMadeProperty: str(r.lastMadeProperty, d.lastMadeProperty),
		trackCookedCount: bool(r.trackCookedCount, d.trackCookedCount),

		allergensProperty: str(r.allergensProperty, d.allergensProperty),
		myAllergens: strArr(r.myAllergens, d.myAllergens),

		showMeatTempWarnings: bool(r.showMeatTempWarnings, d.showMeatTempWarnings),

		ratingProperty: str(r.ratingProperty, d.ratingProperty),
		caloriesProperty: str(r.caloriesProperty, d.caloriesProperty),
		proteinProperty: str(r.proteinProperty, d.proteinProperty),
		fatProperty: str(r.fatProperty, d.fatProperty),
		carbsProperty: str(r.carbsProperty, d.carbsProperty),

		suggestionDayWindow: num(r.suggestionDayWindow, d.suggestionDayWindow, 1),
		suggestionCount: num(r.suggestionCount, d.suggestionCount, 1),

		showHighGIWarnings: bool(r.diabeticModeEnabled, d.showHighGIWarnings),
		giDictionary: str(r.giDictionary, d.giDictionary),

		timersEnabled: bool(r.timersEnabled, d.timersEnabled),
		timerAutoStart: bool(r.timerAutoStart, d.timerAutoStart),
		timerCompactDisplay: bool(r.timerCompactDisplay, d.timerCompactDisplay),
		timerRangeDefault: oneOf<"min" | "max">(r.timerRangeDefault, ["min", "max"], d.timerRangeDefault),
		timerMinuteIncrement: num(r.timerMinuteIncrement, d.timerMinuteIncrement, 1),

		autoAddOnSync: bool(r.autoAddOnSync, d.autoAddOnSync),
		autoAddTagFilter: str(r.autoAddTagFilter, d.autoAddTagFilter),

		mealTypeNotation: oneOf<"tag" | "dataview" | "text">(r.mealTypeNotation, ["tag", "dataview", "text"], d.mealTypeNotation),
		mealTypeFieldName: str(r.mealTypeFieldName, d.mealTypeFieldName),

		importerTemplatePath: str(r.importerTemplatePath, d.importerTemplatePath),
		importerDefaultFolder: str(r.importerDefaultFolder, d.importerDefaultFolder),

		headerBadges: Array.isArray(r.headerBadges)
			? (r.headerBadges as unknown[]).map(validateBadge).filter((x): x is CustomBadge => x !== null)
			: d.headerBadges,
		showTagsInHeader: bool(r.showTagsInHeader, d.showTagsInHeader),
		prefixTagsWithHash: bool(r.prefixTagsWithHash, d.prefixTagsWithHash),
		showFullTagPath: bool(r.showFullTagPath, d.showFullTagPath),

		state: {
			mealPlan: Array.isArray(state.mealPlan)
				? (state.mealPlan as unknown[]).map(validateMealPlanEntry).filter((x): x is MealPlanEntry => x !== null)
				: [],
			groceryItems: Array.isArray(state.groceryItems)
				? (state.groceryItems as unknown[]).map(validateGroceryItemEntry).filter((x): x is GroceryItemEntry => x !== null)
				: [],
			collapsedSections,
			groceryContributions: validateGroceryContributions(state.groceryContributions),
		},
	};
}

function validateGroceryContributionSource(raw: unknown): GroceryContributionSource | null {
	if (!raw || typeof raw !== "object") return null;
	const s = raw as Record<string, unknown>;
	if (s.kind === "manual") return { kind: "manual" };
	if (s.kind === "recipe" && typeof s.path === "string" && s.path) {
		return {
			kind: "recipe",
			path: s.path,
			day: typeof s.day === "string" ? s.day : undefined,
			mealType: typeof s.mealType === "string" ? s.mealType : undefined,
		};
	}
	return null;
}

function validateGroceryContributions(
	raw: unknown,
): Record<string, Array<{ source: GroceryContributionSource; quantity: number | null }>> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	const result: Record<string, Array<{ source: GroceryContributionSource; quantity: number | null }>> = {};
	for (const [key, list] of Object.entries(raw as Record<string, unknown>)) {
		if (!Array.isArray(list)) continue;
		const validated = (list as unknown[]).flatMap((entry) => {
			if (!entry || typeof entry !== "object") return [];
			const e = entry as Record<string, unknown>;
			const source = validateGroceryContributionSource(e.source);
			if (!source) return [];
			const quantity = typeof e.quantity === "number" ? e.quantity : null;
			return [{ source, quantity }];
		});
		if (validated.length > 0) result[key] = validated;
	}
	return result;
}
