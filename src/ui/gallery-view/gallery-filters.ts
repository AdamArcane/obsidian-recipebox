/**
 * Bounded gallery filter set: search/folder/favorite/tag/allergen/rating/
 * never-cooked, all ANDed. Deliberately not built on the generic
 * discovery/filter-evaluate.ts FieldFilter engine -- that engine models
 * "any property, any operator" (Bases/Dataview territory), while the gallery
 * is scoped to a fixed, known set of facets the plugin already understands.
 */
import { App, CachedMetadata, TFile, getAllTags } from "obsidian";
import { RecipeBoxSettings, GallerySavedState } from "../../settings/settings-types";
import { readRecipeMeta, matchingAllergens } from "../../parser/recipe-meta-read";
import { readRating } from "../recipe-view/rating";

export type GalleryFilterState = GallerySavedState;

/** Recursive folder match: the file is inside `folder` or one of its subfolders. */
function inFolder(file: TFile, folder: string): boolean {
	const base = folder.replace(/\/$/, "");
	return file.parent?.path === base || file.path.startsWith(base + "/");
}

function fileTags(cache: CachedMetadata | null): string[] {
	if (!cache) return [];
	return (getAllTags(cache) ?? []).map((t) => (t.startsWith("#") ? t.slice(1) : t));
}

export function matchesGalleryFilters(
	app: App,
	file: TFile,
	cache: CachedMetadata | null,
	state: GalleryFilterState,
	settings: RecipeBoxSettings,
): boolean {
	if (state.search.trim() && !file.basename.toLowerCase().includes(state.search.trim().toLowerCase())) {
		return false;
	}

	if (state.folder && !inFolder(file, state.folder)) return false;

	const fm: Record<string, unknown> = cache?.frontmatter ?? {};
	const meta = readRecipeMeta(cache, settings);

	if (state.favoriteOnly && !meta.favorite) return false;

	if (state.tag && !fileTags(cache).includes(state.tag)) return false;

	if (state.excludeAllergens && matchingAllergens(meta.allergens, settings.myAllergens).length > 0) {
		return false;
	}

	if (state.minRating > 0 && readRating(fm, settings.ratingProperty) < state.minRating) return false;

	if (state.neverCooked && meta.cookedCount !== 0) return false;

	return true;
}

/** Distinct folder paths present among the given files, sorted alphabetically. */
export function distinctFolders(files: TFile[]): string[] {
	const set = new Set<string>();
	for (const file of files) {
		if (file.parent && file.parent.path !== "/") set.add(file.parent.path);
	}
	return [...set].sort((a, b) => a.localeCompare(b));
}

/** Distinct tags present among the given files, sorted alphabetically. */
export function distinctTags(app: App, files: TFile[]): string[] {
	const set = new Set<string>();
	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		for (const tag of fileTags(cache)) set.add(tag);
	}
	return [...set].sort((a, b) => a.localeCompare(b));
}
