/**
 * Renders the heart-shaped favorite toggle button in the recipe view header
 * and persists its state to the "favorite" frontmatter property.
 */
import { App, setIcon, TFile } from "obsidian";
import { RECIPE_FRONTMATTER } from "../../settings/frontmatter-keys";
import { toBoolean } from "../../parser/frontmatter-coerce";

async function setFavorite(app: App, file: TFile, value: boolean): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		const f = fm as Record<string, unknown>;
		if (value) {
			f[RECIPE_FRONTMATTER.favorite] = true;
		} else {
			delete f[RECIPE_FRONTMATTER.favorite];
		}
	});
}

export function renderFavoriteToggle(
	container: HTMLElement,
	app: App,
	file: TFile,
	fm: Record<string, unknown>,
): void {
	let active = toBoolean(fm[RECIPE_FRONTMATTER.favorite]);
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
		void setFavorite(app, file, active);
	});
}
