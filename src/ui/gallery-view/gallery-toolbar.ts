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
import { GallerySavedState, GallerySortField, RecipeBoxSettings } from "../../settings/settings-types";
import { debounce } from "../../utils/debounce";
import { distinctFolders, distinctTags } from "./gallery-filters";
import { DiscoveryResult } from "../../discovery/discovery-cache";
import { FieldFilter } from "../../discovery/filter-types";
import { buildPickerFieldList } from "../components/field-picker";
import { renderFieldFilterRow } from "../components/filter-row";

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

const CLEARED_FILTERS: Pick<GallerySavedState, "folder" | "tag" | "favoriteOnly" | "minRating" | "neverCooked" | "excludeAllergens" | "fieldFilters"> = {
	folder: null,
	tag: null,
	favoriteOnly: false,
	minRating: 0,
	neverCooked: false,
	excludeAllergens: false,
	fieldFilters: [],
};

// Search isn't a "filter" for this purpose (it has its own always-visible
// field and isn't reset by "Clear filters"), so it's excluded here too.
function hasActiveFilters(state: GallerySavedState): boolean {
	return state.folder !== null
		|| state.tag !== null
		|| state.favoriteOnly
		|| state.minRating > 0
		|| state.neverCooked
		|| state.excludeAllergens
		|| state.fieldFilters.length > 0;
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

/**
 * Renders the "+ Property filter" button into `panel`'s main control row, at
 * whatever point in DOM order it's called (the caller places it wherever it
 * wants the button to sit among folder/tag/rating/checkboxes). Clicking it
 * needs to re-render the row list below, but that list isn't built until
 * after the checkboxes -- `getRenderRows` is called lazily on click, once the
 * real render function has been assigned, rather than passed directly.
 */
function renderAddFieldFilterButton(
	panel: HTMLElement,
	state: GallerySavedState,
	getRenderRows: () => () => void,
): void {
	const addBtn = panel.createEl("button", { cls: "rb-gallery-filter-panel-btn" });
	setIcon(addBtn, "plus");
	addBtn.createSpan({ text: "Property filter" });
	addBtn.addEventListener("click", () => {
		const filter: FieldFilter = { field: "", operator: "eq", value: "" };
		state.fieldFilters = [...state.fieldFilters, filter];
		getRenderRows()();
	});
}

/**
 * Renders the open-ended "property filters" (season, cuisine, difficulty,
 * ...) row list: a full-width block (via `rb-gallery-field-filters`'s
 * flex-basis: 100%) that collapses to nothing when empty, so an untouched
 * filter panel looks the same as before this feature. Field/operator/value
 * edits mutate `state.fieldFilters` in place (same convention as the mode
 * editor's draft); a value input only reports the change once it settles
 * (blur/Enter, see filter-row.ts) rather than per keystroke, since rebuilding
 * this whole list on every keystroke would tear down a value input's native
 * autocomplete popup mid-typing. The debounce here is a small extra buffer
 * for rapid field/operator/checkbox changes, not the thing keeping value
 * typing smooth. Returns the re-render function so the "+ Property filter"
 * button (rendered earlier, in the main control row) can trigger it after
 * pushing a new blank filter.
 */
function renderFieldFilterList(
	panel: HTMLElement,
	state: GallerySavedState,
	settings: RecipeBoxSettings,
	discovery: DiscoveryResult | null,
	onChange: (next: GallerySavedState) => void,
): () => void {
	const fields = buildPickerFieldList(settings, discovery);
	const section = panel.createDiv({ cls: "rb-gallery-field-filters" });
	const listEl = section.createDiv({ cls: "rb-rule-list" });

	const commit = (): void => onChange({ ...state, fieldFilters: state.fieldFilters });
	const debouncedCommit = debounce(commit, 200);

	const renderRows = (): void => {
		listEl.empty();
		state.fieldFilters.forEach((filter, index) => {
			// Index-derived, not filter-derived: filters have no id of their own,
			// and rows are never reordered (only appended/removed), so a row's
			// index is stable for as long as the user is actively editing it.
			renderFieldFilterRow(listEl, filter, fields, discovery, `rb-gallery-filter-${index}`, debouncedCommit, () => {
				state.fieldFilters = state.fieldFilters.filter((f) => f !== filter);
				renderRows();
				commit();
			});
		});
		section.toggleClass("is-empty", state.fieldFilters.length === 0);
	};
	renderRows();
	return renderRows;
}

function renderFilterPanel(
	container: HTMLElement,
	app: App,
	files: TFile[],
	state: GallerySavedState,
	settings: RecipeBoxSettings,
	discovery: DiscoveryResult | null,
	hasAllergenList: boolean,
	onChange: (next: GallerySavedState) => void,
	onToggleRememberFilters: (remember: boolean) => void,
): void {
	const panel = container.createDiv({ cls: "rb-gallery-filter-panel" });

	// Its own row, above the actual filter controls, right-aligned: neither of
	// these is a filter criterion -- "Remember filters" is a persistence
	// preference and "Clear" is an action -- so they don't belong mixed in
	// with the folder/tag/rating/checkbox row below.
	const header = panel.createDiv({ cls: "rb-gallery-filter-panel-header" });

	// Only shown once there's something to clear
	if (hasActiveFilters(state)) {
		const clearBtn = header.createEl("button", { cls: "rb-gallery-filter-panel-btn" });
		setIcon(clearBtn, "eraser");
		clearBtn.createSpan({ text: "Clear" });
		clearBtn.addEventListener("click", () => onChange({ ...state, ...CLEARED_FILTERS }));
	}


	const rememberToggle = header.createEl("label", { cls: "rb-gallery-toggle" });
	const rememberCheckbox = rememberToggle.createEl("input", { attr: { type: "checkbox" } });
	rememberCheckbox.checked = settings.galleryRememberFilters;
	rememberToggle.createSpan({ text: "Remember filters" });
	rememberCheckbox.addEventListener("change", () => {
		onToggleRememberFilters(rememberCheckbox.checked);
	});


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

	// Rendered here (before the checkboxes) so it lands in the main control
	// row right after the other pickers; renderFieldFilterRows is only
	// assigned once the row list is built further down.
	let renderFieldFilterRows: () => void = () => {};
	renderAddFieldFilterButton(panel, state, () => renderFieldFilterRows);

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

	renderFieldFilterRows = renderFieldFilterList(panel, state, settings, discovery, onChange);
}

export function renderGalleryToolbar(
	container: HTMLElement,
	app: App,
	files: TFile[],
	state: GallerySavedState,
	settings: RecipeBoxSettings,
	discovery: DiscoveryResult | null,
	hasAllergenList: boolean,
	filterPanelOpen: boolean,
	onChange: (next: GallerySavedState) => void,
	onToggleRememberFilters: (remember: boolean) => void,
	onToggleFilterPanel: () => void,
): void {
	const bar = container.createDiv({ cls: "rb-gallery-toolbar" });

	const searchWrap = bar.createDiv({ cls: "rb-gallery-search-wrap" });
	const searchIcon = searchWrap.createSpan({ cls: "rb-gallery-search-icon" });
	setIcon(searchIcon, "search");

	const searchInput = searchWrap.createEl("input", {
		cls: "rb-gallery-search",
		attr: { type: "search", placeholder: "Search recipes…", "data-rb-focus-key": "gallery-search" },
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
		renderFilterPanel(container, app, files, state, settings, discovery, hasAllergenList, onChange, onToggleRememberFilters);
	}
}
