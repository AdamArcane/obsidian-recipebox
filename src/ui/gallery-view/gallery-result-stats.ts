/**
 * Renders a row of stats about the current gallery view, based on the current
 * GallerySavedState and the number of files that passed the filters.
 */
import { TFile } from "obsidian";
import { GallerySavedState } from "../../settings/settings-types";
import { FieldFilter, OPERATORS } from "../../discovery/filter-types";

function operatorLabel(operator: string): string {
	for (const ops of Object.values(OPERATORS)) {
		const match = ops.find((op) => op.id === operator);
		if (match) return match.label;
	}
	return operator;
}

/** Human-readable summary of one property filter, e.g. "season is one of summer, fall". */
function fieldFilterLabel(filter: FieldFilter): string {
	if (filter.field.startsWith("#")) {
		const name = filter.field.slice(1);
		return filter.operator === "not-has" ? `not tagged #${name}` : `tagged #${name}`;
	}

	if (["is-true", "is-false"].includes(filter.operator)) {
		return `${filter.field} ${operatorLabel(filter.operator)}`;
	}

	if (filter.operator === "between" && Array.isArray(filter.value)) {
		const [lo, hi] = filter.value as [string | number, string | number];
		return `${filter.field} between ${String(lo)} and ${String(hi)}`;
	}

	if (filter.operator === "within-last" || filter.operator === "not-within-last") {
		return `${filter.field} ${operatorLabel(filter.operator).replace("N days", `${String(filter.value)} days`)}`;
	}

	if (filter.operator === "one-of" && Array.isArray(filter.value)) {
		return `${filter.field} is one of ${(filter.value as string[]).join(", ")}`;
	}

	return `${filter.field} ${operatorLabel(filter.operator)} ${filter.value as string}`;
}

export function renderStatsRow(
	container: HTMLElement,
	files: TFile[],
	state: GallerySavedState
): void {

	type FilterChip = { key: keyof GallerySavedState | "fieldFilter"; label: string };

	const filterChips: FilterChip[] = [];
	if (state.folder) filterChips.push({ key: "folder", label: `in folder ${state.folder}` });
	if (state.favoriteOnly) filterChips.push({ key: "favoriteOnly", label: "favorites only" });
	if (state.tag) filterChips.push({ key: "tag", label: `tagged #${state.tag}` });
	if (state.minRating > 0) filterChips.push({ key: "minRating", label: `rating ≥ ${state.minRating}` });
	if (state.neverCooked) filterChips.push({ key: "neverCooked", label: "never cooked" });
	if (state.excludeAllergens) filterChips.push({ key: "excludeAllergens", label: "excluding allergens" });
	// A filter row with no property chosen yet doesn't restrict anything (see
	// filter-evaluate.ts), so it's excluded here too -- it shouldn't read as
	// an active filter when it isn't functioning as one yet.
	for (const filter of state.fieldFilters) {
		if (!filter.field) continue;
		filterChips.push({ key: "fieldFilter", label: fieldFilterLabel(filter) });
	}

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
