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
import type { SuggesterMode, FieldFilter, ScoringRule } from "../suggester/strategy-types";
import { BUILTIN_MODES } from "../suggester/built-in-strategies";
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
		isLeftovers: e.isLeftovers === true ? true : undefined,
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

// ── suggester validators ─────────────────────────────────────────────────────

function validateFieldFilter(raw: unknown): FieldFilter | null {
	if (!raw || typeof raw !== "object") return null;
	const f = raw as Record<string, unknown>;
	if (typeof f.field !== "string" || !f.field) return null;
	if (typeof f.operator !== "string" || !f.operator) return null;
	return { field: f.field, operator: f.operator, value: f.value };
}

function validateScoringRule(raw: unknown): ScoringRule | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	if (typeof r.field !== "string" || !r.field) return null;
	if (r.direction !== "favor-high" && r.direction !== "favor-low" && r.direction !== "favor-none") return null;
	return { field: r.field, direction: r.direction };
}

function validateSuggesterMode(raw: unknown): SuggesterMode | null {
	if (!raw || typeof raw !== "object") return null;
	const s = raw as Record<string, unknown>;
	if (typeof s.id !== "string" || !s.id) return null;
	if (typeof s.name !== "string" || !s.name) return null;
	const filters = Array.isArray(s.filters)
		? (s.filters as unknown[]).map(validateFieldFilter).filter((x): x is FieldFilter => x !== null)
		: [];
	const rules = Array.isArray(s.rules)
		? (s.rules as unknown[]).map(validateScoringRule).filter((x): x is ScoringRule => x !== null)
		: [];
	return {
		id: s.id,
		name: s.name,
		filters,
		rules,
		isBuiltin: bool(s.isBuiltin, false),
		isDefault: bool(s.isDefault, false),
	};
}

/**
 * Load saved modes, falling back to the built-in defaults for any that
 * are missing. Built-ins are never removed even if the saved list omits them,
 * so an upgrade that adds a new built-in mode shows up without a full reset.
 */
function mergeModes(raw: unknown): SuggesterMode[] {
	if (!Array.isArray(raw)) return BUILTIN_MODES.map(s => ({ ...s }));

	const saved = (raw as unknown[])
		.map(validateSuggesterMode)
		.filter((x): x is SuggesterMode => x !== null);

	// Re-add any built-ins the saved list doesn't contain (e.g. a new built-in added in an update).
	const savedIds = new Set(saved.map(s => s.id));
	for (const builtin of BUILTIN_MODES) {
		if (!savedIds.has(builtin.id)) saved.push({ ...builtin });
	}

	return saved;
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

	const merged: RecipeBoxSettings = {
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
		cleanNoteBody: bool(r.cleanNoteBody, d.cleanNoteBody),

		cookHistoryEnabled: bool(r.cookHistoryEnabled, d.cookHistoryEnabled),
		cookHistoryHeading: str(r.cookHistoryHeading, d.cookHistoryHeading),
		cookHistoryFrontmatterProperty: str(r.cookHistoryFrontmatterProperty, d.cookHistoryFrontmatterProperty),
		lastMadeProperty: str(r.lastMadeProperty, d.lastMadeProperty),
		cookedCountProperty: str(r.cookedCountProperty, d.cookedCountProperty),

		allergensProperty: str(r.allergensProperty, d.allergensProperty),
		myAllergens: strArr(r.myAllergens, d.myAllergens),

		showMeatTempWarnings: bool(r.showMeatTempWarnings, d.showMeatTempWarnings),

		ratingProperty: str(r.ratingProperty, d.ratingProperty),
		caloriesProperty: str(r.caloriesProperty, d.caloriesProperty),
		proteinProperty: str(r.proteinProperty, d.proteinProperty),
		fatProperty: str(r.fatProperty, d.fatProperty),
		carbsProperty: str(r.carbsProperty, d.carbsProperty),

		// Support migration from the old "suggesterStrategies" key (renamed to "suggesterModes")
		suggesterModes: mergeModes(r.suggesterModes ?? r.suggesterStrategies),

		showHighGIWarnings: bool(r.diabeticModeEnabled, d.showHighGIWarnings),
		giDictionary: str(r.giDictionary, d.giDictionary),

		timersEnabled: bool(r.timersEnabled, d.timersEnabled),
		timerAutoStart: bool(r.timerAutoStart, d.timerAutoStart),
		timerCompactDisplay: bool(r.timerCompactDisplay, d.timerCompactDisplay),
		timerRangeDefault: oneOf<"min" | "max">(r.timerRangeDefault, ["min", "max"], d.timerRangeDefault),

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
			// Support migration from old "lastUsedStrategyId" key
			lastUsedModeId: typeof state.lastUsedModeId === "string" ? state.lastUsedModeId
				: typeof state.lastUsedStrategyId === "string" ? state.lastUsedStrategyId : undefined,
		},
	};


	return merged;
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
