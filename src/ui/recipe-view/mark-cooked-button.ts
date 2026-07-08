/**
 * Renders the "Mark as cooked" button in the recipe view header and handles
 * the quick-stamp path (no modal) as well as the full history modal path.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { addCookHistoryEntry } from "../../recipe-history/cook-history";


export function renderMarkCookedButton(
	container: HTMLElement,
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	deps: RecipeViewDeps,
): void {

	if (!settings.cookHistoryEnabled) return;

	const btn = container.createEl("button", {
		cls: "rb-action-btn",
		attr: { "aria-label": "Mark as cooked" },
	});
	const iconEl = btn.createSpan();
	setIcon(iconEl, "circle-check-big");

	btn.addEventListener("click", () => {
		deps.openMarkCookedModal(file, (date, notes, image) => {
			void addCookHistoryEntry(app, file, settings, date, notes, image);
		});

	});
}
