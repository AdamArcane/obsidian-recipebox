/**
 * Week-at-a-glance meal plan preview: seven thin day columns, each showing a
 * stacked list of up to 4 scheduled entries (small thumbnail, truncated
 * title, meal type underneath), or a dash when empty. Each entry row is its
 * own click target (opens that recipe / the meal plan for a custom entry) --
 * no day-level popover. This is a separate, simplified component from
 * week-grid.ts -- it deliberately does not carry that view's drag-and-drop
 * rescheduling wiring, which a glance preview has no business owning (see
 * dashboard-spec.md section 11.3).
 */
import { App, setIcon, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { getFrontmatterImageSrc } from "../gallery-view/gallery-image";
import { resolveImagePath } from "../recipe-view/image-resolve";
import { defaultRecipeImageValue } from "../../parser/resolve-hero-image";

export interface MealPlanMiniGridActions {
	openRecipe: (file: TFile) => void;
	openMealPlanView: () => void;
	openSuggestMealModal: () => void;
}

const DAY_COLUMNS: Array<{ label: string; abbrev: string }> = [
	{ label: "Monday", abbrev: "Mon" },
	{ label: "Tuesday", abbrev: "Tue" },
	{ label: "Wednesday", abbrev: "Wed" },
	{ label: "Thursday", abbrev: "Thu" },
	{ label: "Friday", abbrev: "Fri" },
	{ label: "Saturday", abbrev: "Sat" },
	{ label: "Sunday", abbrev: "Sun" },
];

const MAX_VISIBLE_ENTRIES = 3;

function entryTitle(entry: MealPlanEntry): string {
	return entry.recipePath ? entry.recipePath.split("/").pop()!.replace(/\.md$/, "") : (entry.label ?? "Custom meal");
}

// Frontmatter-only resolution, same as shared-recipes-preview.ts -- no lazy
// body-image fallback pass here, this is a compact thumbnail, not a card grid.
function resolveDayThumbSrc(app: App, entry: MealPlanEntry, settings: RecipeBoxSettings, defaultSrc: string | null): string | null {
	if (!entry.recipePath) return null;
	const file = app.vault.getFileByPath(entry.recipePath);
	if (!file) return null;
	return getFrontmatterImageSrc(app, file, settings) ?? defaultSrc;
}

function renderEntryRow(
	list: HTMLElement,
	app: App,
	entry: MealPlanEntry,
	settings: RecipeBoxSettings,
	defaultSrc: string | null,
	actions: MealPlanMiniGridActions,
): void {
	const row = list.createDiv({ cls: "rb-dashboard-mpg-entry", attr: { title: entryTitle(entry), role: "button", tabindex: "0" } });

	const thumb = row.createDiv({ cls: "rb-dashboard-mpg-entry-thumb" });
	const src = resolveDayThumbSrc(app, entry, settings, defaultSrc);
	if (src) {
		thumb.createEl("img", { attr: { src, loading: "lazy" } });
	} else {
		thumb.addClass("rb-dashboard-mpg-entry-thumb--empty");
		setIcon(thumb, entry.recipePath ? "utensils" : "utensils-crossed");
	}

	const textCol = row.createDiv({ cls: "rb-dashboard-mpg-entry-text" });
	textCol.createDiv({ cls: "rb-dashboard-mpg-entry-title", text: entryTitle(entry) });
	if (entry.meal) textCol.createDiv({ cls: "rb-dashboard-mpg-entry-meal", text: entry.meal });

	const open = (): void => {
		if (entry.recipePath) {
			const file = app.vault.getFileByPath(entry.recipePath);
			if (file) actions.openRecipe(file);
		}
		else {
			actions.openMealPlanView();
		}
	};
	row.addEventListener("click", (e) => {
		e.stopPropagation();
		open();
	});
	row.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			e.stopPropagation();
			open();
		}
	});
}

export function renderMealPlanMiniGrid(
	container: HTMLElement,
	app: App,
	entries: MealPlanEntry[],
	settings: RecipeBoxSettings,
	actions: MealPlanMiniGridActions,
): void {
	const grid = container.createDiv({ cls: "rb-dashboard-mpg" });
	const defaultImageValue = defaultRecipeImageValue(settings);
	const defaultSrc = defaultImageValue ? resolveImagePath(app, defaultImageValue) : null;

	for (const col of DAY_COLUMNS) {
		const dayEntries = entries.filter((e) => e.day?.toLowerCase() === col.label.toLowerCase());
		const colEl = grid.createDiv({ cls: "rb-dashboard-mpg-col" });
		colEl.createDiv({ cls: "rb-dashboard-mpg-day", text: col.abbrev });

		if (dayEntries.length === 0) {
			colEl.addClass("rb-dashboard-mpg-col--empty");
			colEl.setAttribute("role", "button");
			colEl.setAttribute("tabindex", "0");
			colEl.createDiv({ cls: "rb-dashboard-mpg-empty", text: "–" });
			colEl.addEventListener("click", () => actions.openSuggestMealModal());
		} else {
			const list = colEl.createDiv({ cls: "rb-dashboard-mpg-list" });
			for (const entry of dayEntries.slice(0, MAX_VISIBLE_ENTRIES)) {
				renderEntryRow(list, app, entry, settings, defaultSrc, actions);
			}
			if (dayEntries.length > MAX_VISIBLE_ENTRIES) {
				list.createDiv({ cls: "rb-dashboard-mpg-more", text: `+${dayEntries.length - MAX_VISIBLE_ENTRIES} more` });
			}
		}
	}
}
