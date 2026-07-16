/**
 * Renders the gallery's search bar and Filter/Sort icon buttons, plus the
 * expandable filter panel. Stateless -- reads the current GallerySavedState
 * (and whether the filter panel is open) in and calls back on change;
 * GalleryView owns persistence, the panel-open flag, and re-render.
 *
 * Sort is a single pick, so it's a native Obsidian Menu (closes on
 * selection). Filter holds several independent controls someone would want
 * to combine (folder, tag, rating, two checkboxes) -- a poor fit for Menu,
 * which has no submenus and closes after any one click -- so it's a plain
 * panel that expands below the toolbar and stays open across changes.
 */
import { App, Menu, setIcon, TFile } from "obsidian";
import { GallerySavedState, GallerySortField } from "../../settings/settings-types";
import { debounce } from "../../utils/debounce";
import { distinctFolders, distinctTags } from "./gallery-filters";

const SORT_FIELD_LABELS: Record<GallerySortField, string> = {
	title: "Title",
	"date-added": "Date added",
	"date-modified": "Last modified",
	"last-cooked": "Last cooked",
	rating: "Rating",
	"times-cooked": "Times cooked",
};

const SORT_FIELD_ICONS: Record<GallerySortField, string> = {
	title: "type",
	"date-added": "calendar-plus",
	"date-modified": "calendar-clock",
	"last-cooked": "history",
	rating: "star",
	"times-cooked": "repeat",
};

const RATING_LABELS: Record<number, string> = {
	0: "Any rating",
	1: "1+ stars",
	2: "2+ stars",
	3: "3+ stars",
	4: "4+ stars",
	5: "5 stars",
};

const CLEARED_FILTERS: Pick<GallerySavedState, "folder" | "tag" | "favoriteOnly" | "minRating" | "neverCooked" | "excludeAllergens"> = {
	folder: null,
	tag: null,
	favoriteOnly: false,
	minRating: 0,
	neverCooked: false,
	excludeAllergens: false,
};

// Search isn't a "filter" for this purpose (it has its own always-visible
// field and isn't reset by "Clear filters"), so it's excluded here too.
function hasActiveFilters(state: GallerySavedState): boolean {
	return state.folder !== null
		|| state.tag !== null
		|| state.favoriteOnly
		|| state.minRating > 0
		|| state.neverCooked
		|| state.excludeAllergens;
}

function openSortMenu(evt: MouseEvent, state: GallerySavedState, onChange: (next: GallerySavedState) => void): void {
	const menu = new Menu();
	for (const [value, label] of Object.entries(SORT_FIELD_LABELS) as [GallerySortField, string][]) {
		menu.addItem((item) =>
			item.setTitle(label)
				.setIcon(SORT_FIELD_ICONS[value])
				.setChecked(state.sortField === value)
				.onClick(() => onChange({ ...state, sortField: value }))
		);
	}

	menu.addSeparator();

	menu.addItem((item) =>
		item.setTitle("Ascending")
			.setIcon("arrow-up-narrow-wide")
			.setChecked(state.sortDirection === "asc")
			.onClick(() => onChange({ ...state, sortDirection: "asc" }))
	);
	menu.addItem((item) =>
		item.setTitle("Descending")
			.setIcon("arrow-down-wide-narrow")
			.setChecked(state.sortDirection === "desc")
			.onClick(() => onChange({ ...state, sortDirection: "desc" }))
	);

	menu.showAtMouseEvent(evt);
}

function renderFilterPanel(
	container: HTMLElement,
	app: App,
	files: TFile[],
	state: GallerySavedState,
	hasAllergenList: boolean,
	onChange: (next: GallerySavedState) => void,
	onHide: () => void,
): void {
	const panel = container.createDiv({ cls: "rb-gallery-filter-panel" });

	const folderSelect = panel.createEl("select", { cls: "rb-gallery-select" });
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

	const tagSelect = panel.createEl("select", { cls: "rb-gallery-select" });
	tagSelect.createEl("option", { value: "", text: "All tags" });
	for (const tag of distinctTags(app, files)) {
		const opt = tagSelect.createEl("option", { value: tag, text: tag });
		if (state.tag === tag) opt.selected = true;
	}
	tagSelect.addEventListener("change", () => {
		onChange({ ...state, tag: tagSelect.value || null });
	});

	const ratingSelect = panel.createEl("select", { cls: "rb-gallery-select" });
	for (let i = 0; i <= 5; i++) {
		const opt = ratingSelect.createEl("option", { value: String(i), text: RATING_LABELS[i] });
		if (state.minRating === i) opt.selected = true;
	}
	ratingSelect.addEventListener("change", () => {
		onChange({ ...state, minRating: Number(ratingSelect.value) });
	});

	const favoriteToggle = panel.createEl("label", { cls: "rb-gallery-toggle" });
	const favoriteCheckbox = favoriteToggle.createEl("input", { attr: { type: "checkbox" } });
	favoriteCheckbox.checked = state.favoriteOnly;
	favoriteToggle.createSpan({ text: "Favorites only" });
	favoriteCheckbox.addEventListener("change", () => {
		onChange({ ...state, favoriteOnly: favoriteCheckbox.checked });
	});

	const neverCookedToggle = panel.createEl("label", { cls: "rb-gallery-toggle" });
	const neverCookedCheckbox = neverCookedToggle.createEl("input", { attr: { type: "checkbox" } });
	neverCookedCheckbox.checked = state.neverCooked;
	neverCookedToggle.createSpan({ text: "Never cooked" });
	neverCookedCheckbox.addEventListener("change", () => {
		onChange({ ...state, neverCooked: neverCookedCheckbox.checked });
	});

	if (hasAllergenList) {
		const allergenToggle = panel.createEl("label", { cls: "rb-gallery-toggle" });
		const allergenCheckbox = allergenToggle.createEl("input", { attr: { type: "checkbox" } });
		allergenCheckbox.checked = state.excludeAllergens;
		allergenToggle.createSpan({ text: "Exclude my allergens" });
		allergenCheckbox.addEventListener("change", () => {
			onChange({ ...state, excludeAllergens: allergenCheckbox.checked });
		});
	}

	const footer = panel.createDiv({ cls: "rb-gallery-filter-panel-footer" });

	const clearBtn = footer.createEl("button", { cls: "rb-gallery-filter-panel-btn", text: "Clear filters" });
	clearBtn.addEventListener("click", () => onChange({ ...state, ...CLEARED_FILTERS }));

	const hideBtn = footer.createEl("button", { cls: "rb-gallery-filter-panel-btn", text: "Hide filters" });
	hideBtn.addEventListener("click", onHide);
}

export function renderGalleryToolbar(
	container: HTMLElement,
	app: App,
	files: TFile[],
	state: GallerySavedState,
	hasAllergenList: boolean,
	filterPanelOpen: boolean,
	onChange: (next: GallerySavedState) => void,
	onToggleFilterPanel: () => void,
): void {
	const bar = container.createDiv({ cls: "rb-gallery-toolbar" });

	const searchInput = bar.createEl("input", {
		cls: "rb-gallery-search",
		attr: { type: "search", placeholder: "Search recipes…" },
	});
	searchInput.value = state.search;
	const debouncedSearch = debounce(() => onChange({ ...state, search: searchInput.value }), 200);
	searchInput.addEventListener("input", debouncedSearch);

	const actions = bar.createDiv({ cls: "rb-gallery-toolbar-actions" });

	const filterBtn = actions.createDiv({
		cls: "rb-gallery-toolbar-btn",
		attr: { role: "button", "aria-label": "Filter", tabindex: "0" },
	});
	filterBtn.toggleClass("is-active", filterPanelOpen);
	filterBtn.toggleClass("has-active-filters", hasActiveFilters(state));
	setIcon(filterBtn, "filter");
	filterBtn.addEventListener("click", onToggleFilterPanel);

	const sortBtn = actions.createDiv({
		cls: "rb-gallery-toolbar-btn",
		attr: { role: "button", "aria-label": "Sort", tabindex: "0" },
	});
	setIcon(sortBtn, "arrow-up-down");
	sortBtn.addEventListener("click", (evt) => openSortMenu(evt, state, onChange));

	if (filterPanelOpen) {
		renderFilterPanel(container, app, files, state, hasAllergenList, onChange, onToggleFilterPanel);
	}
}
