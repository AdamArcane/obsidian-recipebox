/**
 * Renders a single recipe card within the meal plan week grid, including the
 * thumbnail, name, meal type, and drag handle.
 */
import { App, TFile, setIcon } from "obsidian";
import { MealPlanEntry } from "../../types";
import { makeDraggable } from "./drag-reschedule";
import { MealPlanViewDeps } from "./meal-plan-view-deps";

function getThumbnailSrc(app: App, recipePath: string): string | null {
	const file = app.vault.getFileByPath(recipePath);
	if (!(file instanceof TFile)) return null;

	const imageValue: unknown = app.metadataCache.getFileCache(file)?.frontmatter?.["image"];
	if (typeof imageValue !== "string" || !imageValue) return null;

	// Absolute URL (http/https)
	if (/^https?:\/\//i.test(imageValue)) return imageValue;

	// Vault-relative path or wikilink
	const bare = imageValue.replace(/^!?\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim();
	const resolved = app.metadataCache.getFirstLinkpathDest(bare, "");
	if (resolved instanceof TFile) return app.vault.getResourcePath(resolved);

	const byPath = app.vault.getFileByPath(bare);
	if (byPath instanceof TFile) return app.vault.getResourcePath(byPath);

	return null;
}

export function renderRecipeCard(
	container: HTMLElement,
	entry: MealPlanEntry,
	app: App,
	deps: MealPlanViewDeps
): void {
	const card = container.createDiv({ cls: "rb-mpv-card" });
	if (entry.isLeftovers) card.addClass("rb-mpv-card--leftovers");
	makeDraggable(card, entry.id);

	// thumbnail
	const thumb = card.createDiv({ cls: "rb-mpv-card-thumb" });
	const src = getThumbnailSrc(app, entry.recipePath);
	if (src) {
		const img = thumb.createEl("img", { attr: { src, loading: "lazy", draggable: "false" } });
		img.onerror = () => { img.remove(); thumb.addClass("rb-mpv-card-thumb--empty"); };
	} else {
		thumb.addClass("rb-mpv-card-thumb--empty");
	}

	// name
	const name = entry.recipePath.split("/").pop()?.replace(/\.md$/i, "") ?? entry.recipePath;
	const body = card.createDiv({ cls: "rb-mpv-card-body" });
	body.createDiv({ cls: "rb-mpv-card-name", text: name });
	if (entry.meal) body.createDiv({ cls: "rb-mpv-card-meal", text: entry.meal });
	if (entry.isLeftovers) body.createDiv({ cls: "rb-mpv-card-leftovers-badge", text: "(Leftovers)" });

	const actions = card.createDiv({ cls: "rb-mpv-card-actions" });
	const editBtn = actions.createEl("button", { cls: "rb-mpv-card-action-btn", attr: { title: "Edit" } });
	setIcon(editBtn, "pencil");
	editBtn.addEventListener("click", (e) => { e.stopPropagation(); deps.openEditEntryModal(entry); });
	const removeBtn = actions.createEl("button", { cls: "rb-mpv-card-action-btn rb-mpv-card-action-btn--danger", attr: { title: "Remove" } });
	setIcon(removeBtn, "trash-2");
	removeBtn.addEventListener("click", (e) => { e.stopPropagation(); void deps.removeFromMealPlan(entry.id); });

	// click to open recipe (not on drag)
	card.addEventListener("click", () => deps.openRecipe(entry.recipePath));
}
