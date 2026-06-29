/**
 * Shared domain types used across the plugin — ingredients, grocery items,
 * meal plan entries, badges, and supporting enumerations.
 */
export type ContributionMap = Record<string, { name: string; unit: string; quantity: number | null }>;

export type GroceryContributionSource =
	| { kind: "recipe"; path: string; day?: string; mealType?: string }
	| { kind: "manual" };

export interface ParsedIngredient {
	quantity: number | null;
	unit: string;
	name: string;
	note: string | null;
	tags: string[];
	raw: string;
}

export interface RecipeIngredient extends ParsedIngredient {
	sourcePath: string;
	sourceLabel: string;
}

export interface GroceryItemEntry {
	id: string;
	name: string;
	quantity: number | null;
	unit: string;
	categoryOverride: string | null;
}

export interface GroceryItemSource {
	kind: "recipe" | "manual";
	label: string;
	path?: string;
	quantity?: number | null;
	day?: string;
	mealType?: string;
}

export interface GroceryItem {
	key: string;
	name: string;
	unit: string;
	quantity: number | null;
	category: string;
	sources: GroceryItemSource[];
	checked: boolean;
}

export type GroupingMode = "category" | "recipe" | "source" | "none";

export type CategorySource = "dictionary" | "tag" | "tag-then-dictionary";

export interface CategoryOverride {
	match: string;
	category: string;
}

export interface MealPlanEntry {
	id: string;
	recipePath: string;   // empty string for leftovers entries
	label?: string;       // display name override; required when recipePath is empty
	day?: string;
	meal?: string;
	addedDate: string;
	contributions: Record<string, { name: string; unit: string; quantity: number | null }>;
	autoAddProcessed?: boolean;
}

export interface IngredientGroup {
	heading: string | null;
	lines: string[];
}

export interface InstructionGroup {
	heading: string | null;
	headingLevel: number;
	steps: string[];
}

export interface RecipeNutrition {
	calories: number | null;
	protein: number | null;
	fat: number | null;
	carbs: number | null;
}

export type NameMatcher<T> = (name: string) => T | null;


export type BadgeColor = "default" | "green" | "blue" | "purple" | "yellow" | "red";

export type BadgeValueType = "auto" | "minutes";

export type BadgeType = "badge" | "separator" | "newline";

export interface CustomBadge {
	type?: BadgeType;
	property: string;
	label: string;
	icon?: string;
	color: BadgeColor;
	valueType: BadgeValueType;
	prefix?: string;
	suffix?: string;
	splitArray: boolean;
	enabled: boolean;
	hideLabel?: boolean;
	formula?: string;
	builtin: boolean;
}
