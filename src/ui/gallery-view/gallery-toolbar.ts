/**
 * Renders the gallery's search/filter/sort toolbar. Stateless -- reads the
 * current GallerySavedState in and calls onChange with the next one; GalleryView
 * owns persistence and re-render.
 */
import { App, TFile } from "obsidian";
import { GallerySavedState, GallerySortOption } from "../../settings/settings-types";
import { debounce } from "../../utils/debounce";
import { distinctFolders, distinctTags } from "./gallery-filters";

const SORT_LABELS: Record<GallerySortOption, string> = {
	"title-asc": "Title (A–Z)",
	"title-desc": "Title (Z–A)",
	"date-added": "Date added",
	"date-modified": "Last modified",
	"last-cooked": "Last cooked",
	rating: "Rating",
	"times-cooked": "Times cooked",
};

const RATING_LABELS: Record<number, string> = {
	0: "Any rating",
	1: "1+ stars",
	2: "2+ stars",
	3: "3+ stars",
	4: "4+ stars",
	5: "5 stars",
};

export function renderGalleryToolbar(
	container: HTMLElement,
	app: App,
	files: TFile[],
	state: GallerySavedState,
	hasAllergenList: boolean,
	onChange: (next: GallerySavedState) => void,
): void {
	const bar = container.createDiv({ cls: "rb-gallery-toolbar" });

	const searchInput = bar.createEl("input", {
		cls: "rb-gallery-search",
		attr: { type: "search", placeholder: "Search recipes…" },
	});
	searchInput.value = state.search;
	const debouncedSearch = debounce(() => onChange({ ...state, search: searchInput.value }), 200);
	searchInput.addEventListener("input", debouncedSearch);

	const folderSelect = bar.createEl("select", { cls: "rb-gallery-select" });
	folderSelect.createEl("option", { value: "", text: "All folders" });
	const folders = distinctFolders(files);
	// A folder-click (see src/integrations/) can set state.folder to a path
	// with no in-scope recipes yet, which wouldn't otherwise appear here --
	// without this the dropdown would misleadingly show "All folders" while
	// the filter is actually narrower.
	if (state.folder && !folders.includes(state.folder)) folders.push(state.folder);
	for (const folder of folders) {
		const opt = folderSelect.createEl("option", { value: folder, text: folder });
		if (state.folder === folder) opt.selected = true;
	}
	folderSelect.addEventListener("change", () => {
		onChange({ ...state, folder: folderSelect.value || null });
	});

	const tagSelect = bar.createEl("select", { cls: "rb-gallery-select" });
	tagSelect.createEl("option", { value: "", text: "All tags" });
	for (const tag of distinctTags(app, files)) {
		const opt = tagSelect.createEl("option", { value: tag, text: tag });
		if (state.tag === tag) opt.selected = true;
	}
	tagSelect.addEventListener("change", () => {
		onChange({ ...state, tag: tagSelect.value || null });
	});

	const ratingSelect = bar.createEl("select", { cls: "rb-gallery-select" });
	for (let i = 0; i <= 5; i++) {
		const opt = ratingSelect.createEl("option", { value: String(i), text: RATING_LABELS[i] });
		if (state.minRating === i) opt.selected = true;
	}
	ratingSelect.addEventListener("change", () => {
		onChange({ ...state, minRating: Number(ratingSelect.value) });
	});

	const favoriteToggle = bar.createEl("label", { cls: "rb-gallery-toggle" });
	const favoriteCheckbox = favoriteToggle.createEl("input", { attr: { type: "checkbox" } });
	favoriteCheckbox.checked = state.favoriteOnly;
	favoriteToggle.createSpan({ text: "Favorites only" });
	favoriteCheckbox.addEventListener("change", () => {
		onChange({ ...state, favoriteOnly: favoriteCheckbox.checked });
	});

	const neverCookedToggle = bar.createEl("label", { cls: "rb-gallery-toggle" });
	const neverCookedCheckbox = neverCookedToggle.createEl("input", { attr: { type: "checkbox" } });
	neverCookedCheckbox.checked = state.neverCooked;
	neverCookedToggle.createSpan({ text: "Never cooked" });
	neverCookedCheckbox.addEventListener("change", () => {
		onChange({ ...state, neverCooked: neverCookedCheckbox.checked });
	});

	if (hasAllergenList) {
		const allergenToggle = bar.createEl("label", { cls: "rb-gallery-toggle" });
		const allergenCheckbox = allergenToggle.createEl("input", { attr: { type: "checkbox" } });
		allergenCheckbox.checked = state.excludeAllergens;
		allergenToggle.createSpan({ text: "Exclude my allergens" });
		allergenCheckbox.addEventListener("change", () => {
			onChange({ ...state, excludeAllergens: allergenCheckbox.checked });
		});
	}

	const sortSelect = bar.createEl("select", { cls: "rb-gallery-select rb-gallery-sort" });
	for (const [value, label] of Object.entries(SORT_LABELS) as [GallerySortOption, string][]) {
		const opt = sortSelect.createEl("option", { value, text: label });
		if (state.sort === value) opt.selected = true;
	}
	sortSelect.addEventListener("change", () => {
		onChange({ ...state, sort: sortSelect.value as GallerySortOption });
	});
}
