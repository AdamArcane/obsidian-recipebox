/** Display built-in labels without changing values stored in notes or callbacks. */
import { currentLanguage, t } from "../../i18n";
import type { SuggesterMode } from "../../suggester/strategy-types";

const CATEGORIES = ["Produce", "Herb", "Meat", "Seafood", "Dairy", "Cheese", "Egg", "Bread", "Pasta", "Grain", "Canned", "Broth", "Sauce", "Condiment", "Oil", "Seasoning", "Baking", "Nuts & Seeds", "Frozen", "Beverage", "Alcohol", "Household", "Other"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
const BUILTIN_MODE_NAMES = ["Rediscover favorite recipes", "My Go-to recipes", "Find new recipes"];

function builtinLabel(value: string, allowed: readonly string[]): string {
	if (!/^fr(?:-|_|$)/i.test(currentLanguage())) return value;
	const key = allowed.find(label => label.toLowerCase() === value.toLowerCase());
	return key ? t(key) : value;
}

export function dayLabel(day: string): string { return builtinLabel(day, days); }
export function mealLabel(meal: string): string { return builtinLabel(meal, meals); }
export function categoryLabel(category: string): string {
	return builtinLabel(category, CATEGORIES);
}

/**
 * Built-in suggester modes are persisted to data.json with their English names,
 * so translating at registration time would freeze whichever language was active
 * when the file was first written. Translate only while the name is still the
 * untouched English default; a name the user edited is shown as typed.
 */
export function modeLabel(mode: Pick<SuggesterMode, "name" | "isBuiltin">): string {
	return mode.isBuiltin ? builtinLabel(mode.name, BUILTIN_MODE_NAMES) : mode.name;
}
