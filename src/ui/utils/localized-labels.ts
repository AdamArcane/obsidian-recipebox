/** Display built-in labels without changing values stored in notes or callbacks. */
import { currentLanguage, t } from "../../i18n";
const CATEGORIES = ["Produce", "Herb", "Meat", "Seafood", "Dairy", "Cheese", "Egg", "Bread", "Pasta", "Grain", "Canned", "Broth", "Sauce", "Condiment", "Oil", "Seasoning", "Baking", "Nuts & Seeds", "Frozen", "Beverage", "Alcohol", "Household", "Other"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];

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
