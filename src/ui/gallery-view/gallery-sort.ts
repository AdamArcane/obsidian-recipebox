/**
 * Sort comparators for the gallery grid. Reuses readRecipeMeta() for the
 * fields that require frontmatter (rating, times cooked, last cooked)
 * rather than re-parsing frontmatter here.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings, GallerySortOption } from "../../settings/settings-types";
import { readRecipeMeta } from "../../parser/recipe-meta-read";
import { readRating } from "../recipe-view/rating";

function compareTitle(a: TFile, b: TFile): number {
	return a.basename.localeCompare(b.basename);
}

export function sortGalleryFiles(
	files: TFile[],
	option: GallerySortOption,
	app: App,
	settings: RecipeBoxSettings,
): TFile[] {
	// "Last cooked" needs cook-history dates to mean anything; without cook
	// history enabled there's no meaningful signal, so fall back to the next
	// most useful ordering rather than sorting on an always-empty field.
	const effectiveOption = option === "last-cooked" && !settings.cookHistoryEnabled ? "date-added" : option;

	const sorted = [...files];
	switch (effectiveOption) {
		case "title-desc":
			sorted.sort((a, b) => compareTitle(b, a));
			break;
		case "date-added":
			sorted.sort((a, b) => b.stat.ctime - a.stat.ctime);
			break;
		case "date-modified":
			sorted.sort((a, b) => b.stat.mtime - a.stat.mtime);
			break;
		case "rating":
			sorted.sort((a, b) => {
				const fmA = app.metadataCache.getFileCache(a)?.frontmatter ?? {};
				const fmB = app.metadataCache.getFileCache(b)?.frontmatter ?? {};
				const ratingDiff = readRating(fmB, settings.ratingProperty) - readRating(fmA, settings.ratingProperty);
				return ratingDiff !== 0 ? ratingDiff : compareTitle(a, b);
			});
			break;
		case "times-cooked":
			sorted.sort((a, b) => {
				const metaA = readRecipeMeta(app.metadataCache.getFileCache(a), settings);
				const metaB = readRecipeMeta(app.metadataCache.getFileCache(b), settings);
				const diff = metaB.cookedCount - metaA.cookedCount;
				return diff !== 0 ? diff : compareTitle(a, b);
			});
			break;
		case "last-cooked":
			sorted.sort((a, b) => {
				const lastA = readRecipeMeta(app.metadataCache.getFileCache(a), settings).lastMade;
				const lastB = readRecipeMeta(app.metadataCache.getFileCache(b), settings).lastMade;
				// Never-cooked recipes always sort last, regardless of direction.
				if (!lastA && !lastB) return compareTitle(a, b);
				if (!lastA) return 1;
				if (!lastB) return -1;
				return lastB.localeCompare(lastA);
			});
			break;
		case "title-asc":
		default:
			sorted.sort(compareTitle);
			break;
	}
	return sorted;
}
