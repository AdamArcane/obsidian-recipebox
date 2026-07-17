/**
 * Renders a row of stats about the current gallery view, based on the current
 * GallerySavedState and the number of files that passed the filters.
 */
import { TFile } from "obsidian";
import { GallerySavedState } from "../../settings/settings-types";



export function renderStatsRow(
	container: HTMLElement,
	files: TFile[],
	state: GallerySavedState
): void {

	type FilterChip = { key: keyof GallerySavedState; label: string };

	const filterChips: FilterChip[] = [];
	if (state.folder) filterChips.push({ key: "folder", label: `in folder ${state.folder}` });
	if (state.favoriteOnly) filterChips.push({ key: "favoriteOnly", label: "favorites only" });
	if (state.tag) filterChips.push({ key: "tag", label: `tagged #${state.tag}` });
	if (state.minRating > 0) filterChips.push({ key: "minRating", label: `rating ≥ ${state.minRating}` });
	if (state.neverCooked) filterChips.push({ key: "neverCooked", label: "never cooked" });
	if (state.excludeAllergens) filterChips.push({ key: "excludeAllergens", label: "excluding allergens" });

	const statsrow = container.createDiv({ cls: "rb-gallery-stats-row" });

	const countDiv = statsrow.createDiv({ cls: "rb-gallery-stats-count" });
	countDiv.createEl("strong", { text: String(files.length) });
	countDiv.createSpan({ text: ` recipe${files.length === 1 ? "" : "s"} found` });

	if (filterChips.length > 0) {
		const filterGroup = statsrow.createDiv({ cls: "rb-gallery-stats-filters" });
		for (const chip of filterChips) {
			filterGroup.createDiv({ cls: "rb-gallery-stats", text: chip.label });
		}
	}

	statsrow.createDiv({
		cls: "rb-gallery-stats-sort",
		text: `sorted by ${state.sortField} ${state.sortDirection}`,
	});
}
