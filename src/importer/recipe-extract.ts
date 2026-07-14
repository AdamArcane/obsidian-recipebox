/**
 * Extracts structured recipe data from raw HTML using the recipe-scrapers library
 * and maps it to the plugin's ExtractedRecipe shape.
 */
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { ExtractorPlugin, RecipeFields, scrapeRecipe } from "recipe-scrapers";
import { ExtractedRecipe, ImportedGroup } from "./recipe-extract-types";
import { parseNutrient } from "./nutrient-parse";

function hostnameFromUrl(url: string): string {
	try {
		const { hostname } = new URL(url);
		return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
	} catch {
		return url;
	}
}

/**
 * recipe-scrapers treats "author" as required on every RecipeData -- and
 * that requirement is enforced during extraction itself, not just
 * validation, so a generic/wild-mode (schema.org-only) site with no author
 * anywhere in its markup makes the whole scrape throw extractor_not_found
 * instead of just omitting the field. There's no built-in fallback for this
 * in wild mode, so we supply one: priority 0 (lowest) means every real
 * extractor -- JSON-LD, microdata, a site-specific scraper -- runs first and
 * wins if it can supply an author; this only fires as a last resort,
 * returning the site's hostname per the library's own documented fallback
 * contract ("if no author, return the site name").
 */
class AuthorFallbackExtractor extends ExtractorPlugin {
	name = "author-fallback";
	priority = 0;
	usedFallback = false;

	constructor($: CheerioAPI, private readonly url: string) {
		super($);
	}

	supports(field: keyof RecipeFields): boolean {
		return field === "author";
	}

	extract<Key extends keyof RecipeFields>(_field: Key): RecipeFields[Key] {
		this.usedFallback = true;
		return hostnameFromUrl(this.url) as RecipeFields[Key];
	}
}

function nutrientValue(nutrients: Record<string, string>, ...keys: string[]): number | null {
	for (const key of keys) {
		const raw = nutrients[key];
		if (raw) {
			const n = parseNutrient(raw);
			if (n !== null) return n;
		}
	}
	return null;
}

function toImportedGroups(
	groups: { name: string | null; items: { value: string }[] }[],
): ImportedGroup[] {
	return groups.map(g => ({ name: g.name ?? null, items: g.items.map(i => i.value) }));
}

export interface ExtractRecipeResult {
	recipe: ExtractedRecipe | null;
	/** Set when no real author could be found and the hostname fallback above supplied one instead. */
	usedAuthorFallback: boolean;
}

export async function extractRecipe(html: string, url: string): Promise<ExtractRecipeResult> {
	try {
		const $ = cheerio.load(html);
		const authorFallback = new AuthorFallbackExtractor($, url);
		const data = await scrapeRecipe(html, url, { extraExtractors: [authorFallback] });
		if (!data?.title) return { recipe: null, usedAuthorFallback: authorFallback.usedFallback };

		const nutrients: Record<string, string> = data.nutrients ?? {};

		return {
			recipe: {
				title: data.title,
				description: data.description ?? "",
				heroImage: data.image || null,
				servings: data.yields || null,
				prepTime: data.prepTime ?? null,
				cookTime: data.cookTime ?? null,
				totalTime: data.totalTime ?? null,
				ingredientGroups: toImportedGroups(data.ingredients ?? []),
				instructionGroups: toImportedGroups(data.instructions ?? []),
				sourceUrl: url,
				calories: nutrientValue(nutrients, "calories", "calorieContent"),
				protein: nutrientValue(nutrients, "proteinContent", "protein"),
				fat: nutrientValue(nutrients, "fatContent", "fat"),
				carbs: nutrientValue(nutrients, "carbohydrateContent", "carbs"),
			},
			usedAuthorFallback: authorFallback.usedFallback,
		};
	} catch {
		return { recipe: null, usedAuthorFallback: false };
	}
}
