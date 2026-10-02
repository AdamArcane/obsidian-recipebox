/**
 * Maps Mealie's native recipe JSON straight to ExtractedRecipe. Pure function,
 * no Obsidian imports.
 *
 * This deliberately does not go through schema.org / recipe-scrapers: Mealie's
 * JSON is not schema.org, and converting it first would flatten ingredient
 * sections (schema.org recipeIngredient is a flat string list). Reading a known
 * JSON structure is not scraping, so the "use recipe-scrapers" rule does not
 * apply. Do not "fix" this into a schema.org round trip.
 *
 * Field names are verified against a real Mealie nightly export (snake_case).
 * The older camelCase API spellings are accepted as a fallback but unverified.
 */
import type { ExtractedRecipe, ImportedGroup } from "../../recipe-extract-types";
import { parseNutrient } from "../../nutrient-parse";
import { isJsonObject, type JsonObject } from "../file-import-detect";
import { parseImportDuration } from "../parse-import-duration";

/** First present value among a snake_case key and its camelCase alias. */
function pick(data: JsonObject, snake: string, camel: string): unknown {
	return data[snake] ?? data[camel];
}

function str(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds groups from items that may each carry a section title. A non-empty
 * title starts a new group; items before the first title sit in an unnamed
 * group, which is dropped when empty.
 */
function toGroups(items: unknown, textOf: (item: JsonObject) => string): ImportedGroup[] {
	const groups: ImportedGroup[] = [{ name: null, items: [] }];
	if (!Array.isArray(items)) return [];
	for (const raw of items) {
		let title = "";
		let text = "";
		if (typeof raw === "string") {
			text = raw.trim();
		} else if (isJsonObject(raw)) {
			title = str(raw.title);
			text = textOf(raw);
		}
		if (title) groups.push({ name: title, items: [] });
		if (text) groups[groups.length - 1].items.push(text);
	}
	// A titled section with no items is noise; an unnamed leading one likewise.
	return groups.filter(g => g.items.length > 0);
}

// display is Mealie's rendered line; originalText goes last because it can be
// stale after the user edits the parsed fields in Mealie.
function ingredientText(item: JsonObject): string {
	return str(item.display) || str(item.note) || str(item.original_text) || str(item.originalText);
}

function nutrient(nutrition: JsonObject, ...keys: string[]): number | null {
	for (const key of keys) {
		const raw = nutrition[key];
		const text = typeof raw === "number" ? String(raw) : str(raw);
		if (!text) continue;
		const n = parseNutrient(text);
		if (n !== null) return n;
	}
	return null;
}

/** Mealie splits yield into a number and a unit word ("12" + "rolls"); rejoin them. */
function servings(data: JsonObject): string | null {
	const text = str(data.recipe_yield ?? data.recipeYield);
	const nums = [data.recipe_servings ?? data.recipeServings, data.recipe_yield_quantity];
	const qty = nums.find((n): n is number => typeof n === "number" && n > 0);
	const joined = [qty !== undefined ? String(qty) : "", text].filter(Boolean).join(" ");
	return joined || null;
}

/** Mealie writes exact *_seconds values and leaves the free-text fields null. */
function minutes(data: JsonObject, base: string, camel: string): number | null {
	const secs = data[`${base}_seconds`];
	if (typeof secs === "number" && secs > 0) return Math.max(1, Math.round(secs / 60));
	return parseImportDuration(pick(data, base, camel));
}

function notes(data: JsonObject): ImportedGroup[] {
	if (!Array.isArray(data.notes)) return [];
	const items: string[] = [];
	for (const raw of data.notes) {
		if (!isJsonObject(raw)) continue;
		const title = str(raw.title);
		const text = str(raw.text);
		if (!text && !title) continue;
		items.push(title && text ? `${title}: ${text}` : title || text);
	}
	return items.length > 0 ? [{ name: null, items }] : [];
}

export function mealieToExtracted(data: unknown): ExtractedRecipe | null {
	if (!isJsonObject(data)) return null;
	const title = str(data.name);
	if (!title) return null;

	const nutrition = isJsonObject(data.nutrition) ? data.nutrition : {};
	const orgUrl = str(pick(data, "org_url", "orgURL"));

	return {
		title,
		description: str(data.description),
		// Mealie's image field is an ID, not a URL; the bundled file is attached by the unit grouper.
		heroImage: null,
		servings: servings(data),
		prepTime: minutes(data, "prep_time", "prepTime"),
		// In a real export perform_time_seconds is populated while cook_time is
		// always null, so perform_time wins and cook_time is only a fallback.
		cookTime: minutes(data, "perform_time", "performTime") ?? minutes(data, "cook_time", "cookTime"),
		totalTime: minutes(data, "total_time", "totalTime"),
		ingredientGroups: toGroups(pick(data, "recipe_ingredient", "recipeIngredient"), ingredientText),
		instructionGroups: toGroups(pick(data, "recipe_instructions", "recipeInstructions"), item => str(item.text)),
		notesGroups: notes(data),
		sourceUrl: /^https?:\/\//i.test(orgUrl) ? orgUrl : "",
		calories: nutrient(nutrition, "calories"),
		protein: nutrient(nutrition, "protein_content", "proteinContent"),
		fat: nutrient(nutrition, "fat_content", "fatContent"),
		carbs: nutrient(nutrition, "carbohydrate_content", "carbohydrateContent"),
	};
}
