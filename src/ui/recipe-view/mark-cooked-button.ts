/**
 * Renders the "Mark as cooked" button in the recipe view header and handles
 * the quick-stamp path (no modal) as well as the full history modal path.
 */
import { App, Notice, setIcon, TFile } from "obsidian";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { localDateISO } from "../../utils/date";
import { addCookHistoryEntry } from "../../recipe-history/cook-history";

async function stampCooked(app: App, file: TFile, settings: RecipeBoxSettings, date: string): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		if (settings.trackLastMade) {
			f[settings.lastMadeProperty] = date;
		}
		if (settings.trackCookedCount) {
			const current = typeof f[RECIPE_FRONTMATTER.cookedCount] === "number"
				? (f[RECIPE_FRONTMATTER.cookedCount] as number)
				: 0;
			f[RECIPE_FRONTMATTER.cookedCount] = current + 1;
			new Notice(`Marked as cooked! Total: ${current + 1}`);
		} else {
			new Notice("Marked as cooked!");
		}
	});
}

export function renderMarkCookedButton(
	container: HTMLElement,
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	deps: RecipeViewDeps,
): void {
	const needsModal = settings.cookHistoryEnabled;
	const btn = container.createEl("button", {
		cls: "rb-action-btn",
		attr: { "aria-label": "Mark as cooked" },
	});
	const iconEl = btn.createSpan();
	setIcon(iconEl, "circle-check-big");

	btn.addEventListener("click", () => {
		if (needsModal) {
			deps.openMarkCookedModal(file, (date, notes, image) => {
				if (settings.cookHistoryEnabled) {
					// addCookHistoryEntry derives lastMade/cookedCount from the full
					// entry list it writes, so stampCooked must not also touch those
					// fields here -- both would race on the same processFrontMatter
					// keys and could leave an incorrect count depending on which
					// write lands last.
					void addCookHistoryEntry(app, file, settings, date, notes, image);
				} else {
					void stampCooked(app, file, settings, date);
				}
			});
		} else {
			void stampCooked(app, file, settings, localDateISO());
		}
	});
}
