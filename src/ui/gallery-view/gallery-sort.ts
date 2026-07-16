/**
 * Sort comparators for the gallery grid. Reuses readRecipeMeta() for the
 * fields that require frontmatter (rating, times cooked, last cooked)
 * rather than re-parsing frontmatter here.
 *
 * Every field shares the same ascending/descending toggle. Each case below
 * computes its natural ascending order (oldest/lowest first) and applies
 * `sign` to flip it for descending -- except "last cooked", where
 * never-cooked recipes always sort last regardless of direction, so that
 * placement is decided before the sign is ever applied.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings, GallerySortField, GallerySortDirection } from "../../settings/settings-types";
import { readRecipeMeta } from "../../parser/recipe-meta-read";
import { readRating } from "../recipe-view/rating";

function compareTitleAsc(a: TFile, b: TFile): number {
	return a.basename.localeCompare(b.basename);
}

function buildComparator(
	field: GallerySortField,
	direction: GallerySortDirection,
	app: App,
	settings: RecipeBoxSettings,
): (a: TFile, b: TFile) => number {
	const sign = direction === "desc" ? -1 : 1;

	switch (field) {
		case "date-added":
			return (a, b) => sign * (a.stat.ctime - b.stat.ctime);

		case "date-modified":
			return (a, b) => sign * (a.stat.mtime - b.stat.mtime);

		case "rating":
			return (a, b) => {
				const fmA = app.metadataCache.getFileCache(a)?.frontmatter ?? {};
				const fmB = app.metadataCache.getFileCache(b)?.frontmatter ?? {};
				const diff = readRating(fmA, settings.ratingProperty) - readRating(fmB, settings.ratingProperty);
				return diff !== 0 ? sign * diff : compareTitleAsc(a, b);
			};

		case "times-cooked":
			return (a, b) => {
				const metaA = readRecipeMeta(app.metadataCache.getFileCache(a), settings);
				const metaB = readRecipeMeta(app.metadataCache.getFileCache(b), settings);
				const diff = metaA.cookedCount - metaB.cookedCount;
				return diff !== 0 ? sign * diff : compareTitleAsc(a, b);
			};

		case "last-cooked":
			return (a, b) => {
				const lastA = readRecipeMeta(app.metadataCache.getFileCache(a), settings).lastMade;
				const lastB = readRecipeMeta(app.metadataCache.getFileCache(b), settings).lastMade;
				// Never-cooked recipes always sort last, regardless of direction.
				if (!lastA && !lastB) return compareTitleAsc(a, b);
				if (!lastA) return 1;
				if (!lastB) return -1;
				return sign * lastA.localeCompare(lastB);
			};

		case "title":
		default:
			return (a, b) => sign * compareTitleAsc(a, b);
	}
}

export function sortGalleryFiles(
	files: TFile[],
	field: GallerySortField,
	direction: GallerySortDirection,
	app: App,
	settings: RecipeBoxSettings,
): TFile[] {
	// "Last cooked" needs cook-history dates to mean anything; without cook
	// history enabled there's no meaningful signal, so fall back to the next
	// most useful ordering rather than sorting on an always-empty field.
	const effectiveField = field === "last-cooked" && !settings.cookHistoryEnabled ? "date-added" : field;

	return [...files].sort(buildComparator(effectiveField, direction, app, settings));
}
