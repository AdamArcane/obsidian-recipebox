/**
 * Renders the heart-shaped favorite toggle button in the recipe view header
 * and persists its state to the "favorite" frontmatter property.
 */
import { App, setIcon, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { getRecipeMetaAliases } from "../../parser/recipe-meta-aliases";
import { toBoolean } from "../../parser/frontmatter-coerce";
import { findValue } from "../../parser/frontmatter-lookup";

async function setFavorite(app: App, file: TFile, settings: RecipeBoxSettings, value: boolean): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		const key = settings.favoriteProperty;
		if (value) {
			f[key] = true;
		} else {
			delete f[key];
		}
	});
}

export function renderFavoriteToggle(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
): void {
	let active = toBoolean(findValue(fm, getRecipeMetaAliases(settings).favorite));
	const btn = container.createEl("button", {
		cls: ["rb-action-btn", active ? "rb-favorite-active" : ""],
		attr: { "aria-pressed": String(active), "aria-label": "Toggle favorite" },
	});
	const iconEl = btn.createSpan();
	setIcon(iconEl, "heart");

	btn.addEventListener("click", () => {
		active = !active;
		btn.setAttribute("aria-pressed", String(active));
		btn.toggleClass("rb-favorite-active", active);
		void setFavorite(app, file, settings, active);
	});
}
