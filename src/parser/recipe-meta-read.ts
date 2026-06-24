import { CachedMetadata } from "obsidian";
import { findValue } from "./frontmatter-lookup";
import { toTagArray, toNumber, toBoolean } from "./frontmatter-coerce";
import { ALIASES } from "./recipe-meta-aliases";

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

function readDiet(fm: Record<string, unknown>): string[] {
	return toTagArray(findValue(fm, ALIASES.diet));
}

function readAllergens(fm: Record<string, unknown>, primaryKey?: string): string[] {
	const candidates = primaryKey
		? [primaryKey, ...ALIASES.allergens.filter(k => k !== primaryKey)]
		: ALIASES.allergens;
	return toTagArray(findValue(fm, candidates));
}

function readTimes(fm: Record<string, unknown>): RecipeTimes {
	const prep = toNumber(findValue(fm, ALIASES.prepTime));
	const cook = toNumber(findValue(fm, ALIASES.cookTime));
	let total = toNumber(findValue(fm, ALIASES.totalTime));
	if (total === null && prep !== null && cook !== null) {
		total = prep + cook;
	}
	return { prep, cook, total };
}

function readFavorite(fm: Record<string, unknown>): boolean {
	return toBoolean(findValue(fm, ALIASES.favorite));
}

function readCookedCount(fm: Record<string, unknown>): number {
	const n = toNumber(findValue(fm, ALIASES.cookedCount));
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
	lastMadeKey: string,
	allergensKey?: string,
): RecipeMeta {
	const fm: Record<string, unknown> = cache?.frontmatter ?? {};
	return {
		diet: readDiet(fm),
		allergens: readAllergens(fm, allergensKey),
		times: readTimes(fm),
		favorite: readFavorite(fm),
		cookedCount: readCookedCount(fm),
		lastMade: readLastMade(fm, lastMadeKey),
	};
}
