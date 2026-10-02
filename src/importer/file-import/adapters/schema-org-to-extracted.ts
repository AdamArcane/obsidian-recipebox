/**
 * Converts a schema.org Recipe (a JSON file's contents) to ExtractedRecipe by
 * wrapping it in a synthetic HTML page and running the existing extractRecipe(),
 * so mapping, nutrients, HowToSection grouping and ISO durations all come from
 * recipe-scrapers rather than hand-rolled code.
 */
import { extractRecipe } from "../../recipe-extract";
import type { ExtractedRecipe } from "../../recipe-extract-types";
import { findSchemaRecipe } from "../file-import-detect";

// A fixed placeholder, never the recipe's real url. getScraper() picks a
// site-specific scraper when it recognizes the host (say allrecipes.com), and
// that scraper expects the site's real markup, so it fails on our synthetic
// page. A host nothing recognizes guarantees wild (schema.org-only) mode.
const PLACEHOLDER_URL = "https://recipebox-import.invalid/";

export async function schemaOrgToExtracted(data: unknown): Promise<ExtractedRecipe | null> {
	const node = findSchemaRecipe(data);
	if (!node) return null;

	// "</" inside the JSON would end the script element early.
	const json = JSON.stringify(data).replace(/<\//g, "<\\/");
	const html = `<html><head><script type="application/ld+json">${json}</script></head><body></body></html>`;

	// usedAuthorFallback is ignored: the fallback author is the placeholder
	// hostname and is never written to a note.
	const { recipe } = await extractRecipe(html, PLACEHOLDER_URL);
	if (!recipe) return null;

	const url = typeof node.url === "string" ? node.url.trim() : "";
	// A schema.org image can be a relative path (Nextcloud) that points at
	// nothing once the file leaves its app; only keep URLs we can fetch.
	const hero = recipe.heroImage && /^(https?:|data:)/i.test(recipe.heroImage) ? recipe.heroImage : null;
	// "notes" is not a schema.org Recipe property, but Mealie writes one (an
	// array of strings), and recipe-scrapers only finds notes in page markup,
	// so it would otherwise be silently lost. Only used when nothing else
	// supplied notes.
	const extraNotes = Array.isArray(node.notes)
		? node.notes.filter((n): n is string => typeof n === "string" && n.trim() !== "").map(n => n.trim())
		: [];
	const notesGroups = recipe.notesGroups.length === 0 && extraNotes.length > 0
		? [{ name: null, items: extraNotes }]
		: recipe.notesGroups;

	return { ...recipe, notesGroups, sourceUrl: /^https?:\/\//i.test(url) ? url : "", heroImage: hero };
}
