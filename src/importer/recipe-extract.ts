/**
 * Extracts structured recipe data from raw HTML using the recipe-scrapers library
 * and maps it to the plugin's ExtractedRecipe shape.
 */
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { ExtractorPlugin, RecipeFields, getScraper } from "recipe-scrapers";
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

// recipe-scrapers treats these as required on every RecipeData -- and that
// requirement is enforced during extraction itself, not just validation, so
// a generic/wild-mode (schema.org-only) site missing any one of them
// anywhere in its markup makes the whole scrape throw extractor_not_found
// instead of just omitting the field. canonicalUrl/language have built-in
// fallbacks baked into the base scraper; these four don't. "author" has a
// documented fallback contract ("if no author, return the site name") that
// just isn't implemented for wild mode, so we replicate it; the other three
// have no such contract, so an empty value stands in -- our own mapping
// below already treats an empty description/image/yields exactly like a
// genuinely absent one.
const FIELDS_WITHOUT_WILD_MODE_FALLBACK: ReadonlyArray<keyof RecipeFields> = ["author", "description", "image", "yields"];

class RequiredFieldFallbackExtractor extends ExtractorPlugin {
	name = "required-field-fallback";
	priority = 0;
	usedAuthorFallback = false;

	constructor($: CheerioAPI, private readonly url: string) {
		super($);
	}

	supports(field: keyof RecipeFields): boolean {
		return FIELDS_WITHOUT_WILD_MODE_FALLBACK.includes(field);
	}

	extract<Key extends keyof RecipeFields>(field: Key): RecipeFields[Key] {
		if (field === "author") {
			this.usedAuthorFallback = true;
			return hostnameFromUrl(this.url) as RecipeFields[Key];
		}
		return "" as RecipeFields[Key];
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
		const fallback = new RequiredFieldFallbackExtractor($, url);
		const ScraperClass = getScraper(url, { wildMode: true });
		const scraper = new ScraperClass(html, url, { extraExtractors: [fallback] });
		// toRecipeObject() runs extraction (where the fallback above matters)
		// but skips recipe-scrapers' own schema validation -- deliberately.
		// That validation rejects an empty description or a non-URL image,
		// but those are exactly the "we don't have this" states the fallback
		// produces for a sparse page, and our own mapping below already
		// treats them as absent, so there's nothing left for that validation
		// to protect against here.
		const data = await scraper.toRecipeObject();
		if (!data?.title) return { recipe: null, usedAuthorFallback: fallback.usedAuthorFallback };

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
			usedAuthorFallback: fallback.usedAuthorFallback,
		};
	} catch {
		return { recipe: null, usedAuthorFallback: false };
	}
}
