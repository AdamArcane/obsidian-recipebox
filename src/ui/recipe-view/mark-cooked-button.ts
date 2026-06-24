import { App, Notice, setIcon, TFile } from "obsidian";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { RecipeViewDeps } from "./recipe-view-deps";
import { localDateISO } from "../../utils/date";
import { appendCookHistoryEntry } from "../../grocery/cook-history";

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
	setIcon(iconEl, "chef-hat");

	btn.addEventListener("click", () => {
		if (needsModal) {
			deps.openMarkCookedModal(file, (date, notes, image) => {
				void stampCooked(app, file, settings, date);
				if (settings.cookHistoryEnabled) {
					void appendCookHistoryEntry(app, file, settings, date, notes, image);
				}
			});
		} else {
			void stampCooked(app, file, settings, localDateISO());
		}
	});
}
