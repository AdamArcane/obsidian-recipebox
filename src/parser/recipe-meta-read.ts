/**
 * Reads structured recipe metadata (diet, allergens, times, favorite flag,
 * cooked count, last-made date) from a file's cached frontmatter.
 */
import { CachedMetadata } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { findValue } from "./frontmatter-lookup";
import { toTagArray, toNumber, toBoolean } from "./frontmatter-coerce";
import { getRecipeMetaAliases } from "./recipe-meta-aliases";

export interface RecipeTimes {
	prep: number | null;
	cook: number | null;
	total: number | null;
}

export interface RecipeMeta {
	diet: string[];
	allergens: string[];
	times: RecipeTimes;
	favorite: boolean;
	cookedCount: number;
	lastMade: string | null;
}

export function formatLocalISO(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function matchingAllergens(recipeAllergens: string[], myAllergens: string[]): string[] {
	if (recipeAllergens.length === 0 || myAllergens.length === 0) return [];
	const mySet = new Set(myAllergens.map(a => a.toLowerCase()));
	return recipeAllergens.filter(a => mySet.has(a.toLowerCase()));
}

function readDiet(fm: Record<string, unknown>, settings: RecipeBoxSettings): string[] {
	return toTagArray(findValue(fm, getRecipeMetaAliases(settings).diet));
}

function readAllergens(fm: Record<string, unknown>, settings: RecipeBoxSettings, primaryKey?: string): string[] {
	const aliases = getRecipeMetaAliases(settings);
	const candidates = primaryKey
		? [primaryKey, ...aliases.allergens.filter(k => k !== primaryKey)]
		: aliases.allergens;
	return toTagArray(findValue(fm, candidates));
}

function readTimes(fm: Record<string, unknown>, settings: RecipeBoxSettings): RecipeTimes {
	const aliases = getRecipeMetaAliases(settings);
	const prep = toNumber(findValue(fm, aliases.prepTime));
	const cook = toNumber(findValue(fm, aliases.cookTime));
	let total = toNumber(findValue(fm, aliases.totalTime));
	if (total === null && prep !== null && cook !== null) {
		total = prep + cook;
	}
	return { prep, cook, total };
}

function readFavorite(fm: Record<string, unknown>, settings: RecipeBoxSettings): boolean {
	return toBoolean(findValue(fm, getRecipeMetaAliases(settings).favorite));
}

function readCookedCount(fm: Record<string, unknown>, settings: RecipeBoxSettings): number {
	const n = toNumber(findValue(fm, getRecipeMetaAliases(settings).cookedCount));
	if (n === null) return 0;
	return Math.max(0, Math.floor(n));
}

function readLastMade(fm: Record<string, unknown>, key: string): string | null {
	const value = fm[key];
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed || null;
	}
	if (value instanceof Date) return formatLocalISO(value);
	return null;
}

export function readRecipeMeta(
	cache: CachedMetadata | null,
	settings: RecipeBoxSettings,
): RecipeMeta {
	const fm: Record<string, unknown> = cache?.frontmatter ?? {};
	return {
		diet: readDiet(fm, settings),
		allergens: readAllergens(fm, settings, settings.allergensProperty),
		times: readTimes(fm, settings),
		favorite: readFavorite(fm, settings),
		cookedCount: readCookedCount(fm, settings),
		lastMade: readLastMade(fm, settings.lastMadeProperty),
	};
}
