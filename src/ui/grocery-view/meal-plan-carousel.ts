/**
 * Renders the horizontal meal-plan carousel above the grocery list, showing
 * planned recipes grouped by day so users can navigate to them quickly.
 */
import { App, TFile } from "obsidian";
import { MealPlanEntry } from "../../types";
import { GroceryViewDeps } from "./grocery-view-deps";

interface DayGroup {
	day: string;
	entries: MealPlanEntry[];
}

function groupByDay(entries: MealPlanEntry[]): DayGroup[] {
	const map = new Map<string, MealPlanEntry[]>();
	for (const entry of entries) {
		const key = entry.day || "Queue";
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(entry);
	}

	// Queue always first, then days in insertion order
	const groups: DayGroup[] = [];
	const unscheduled = map.get("Queue");
	if (unscheduled) groups.push({ day: "Queue", entries: unscheduled });
	for (const [day, dayEntries] of map) {
		if (day !== "Queue") groups.push({ day, entries: dayEntries });
	}
	return groups;
}

function recipeName(path: string): string {
	const base = path.split("/").pop() ?? path;
	return base.replace(/\.md$/i, "");
}

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

function renderRecipeCard(
	container: HTMLElement,
	entry: MealPlanEntry,
	day: string,
	app: App,
	deps: GroceryViewDeps
): void {
	const card = container.createDiv({ cls: "rb-gv-carousel-card" });

	const thumb = card.createDiv({ cls: "rb-gv-carousel-thumb" });
	const src = getThumbnailSrc(app, entry.recipePath);
	if (src) {
		const img = thumb.createEl("img", { attr: { src, loading: "lazy" } });
		img.onerror = () => { img.remove(); thumb.addClass("rb-gv-carousel-thumb--empty"); };
	} else {
		thumb.addClass("rb-gv-carousel-thumb--empty");
	}

	const info = card.createDiv({ cls: "rb-gv-carousel-info" });
	info.createDiv({ cls: "rb-gv-carousel-name", text: recipeName(entry.recipePath) });
	if (day !== "Queue" || entry.meal) {
		const meta: string[] = [];
		if (day !== "Queue") meta.push(day);
		if (entry.meal) meta.push(entry.meal);
		info.createDiv({ cls: "rb-gv-carousel-day", text: meta.join(" · ") });
	} else {
		info.createDiv({ cls: "rb-gv-carousel-day rb-gv-carousel-day--unscheduled", text: "Queue" });
	}

	card.addEventListener("click", () => deps.openFile(entry.recipePath, false));
}

export function renderMealPlanCarousel(
	container: HTMLElement,
	mealPlan: MealPlanEntry[],
	app: App,
	deps: GroceryViewDeps
): void {
	const section = container.createDiv({ cls: "rb-gv-carousel-section" });

	const header = section.createDiv({ cls: "rb-gv-carousel-header" });
	header.createSpan({ cls: "rb-label-caps rb-gv-carousel-title", text: "Meal plan" });
	const link = header.createEl("a", { cls: "rb-gv-summary-link", text: "View →" });
	link.addEventListener("click", () => deps.openMealPlanView());

	if (mealPlan.length === 0) {
		section.createDiv({ cls: "rb-gv-carousel-empty", text: "No meals planned yet." });
		return;
	}

	const track = section.createDiv({ cls: "rb-gv-carousel-track" });
	const groups = groupByDay(mealPlan);

	for (const group of groups) {
		const groupEl = track.createDiv({ cls: "rb-gv-carousel-group" });
		groupEl.createDiv({ cls: "rb-label-caps rb-gv-carousel-group-label", text: group.day });
		const cards = groupEl.createDiv({ cls: "rb-gv-carousel-cards" });
		for (const entry of group.entries) {
			renderRecipeCard(cards, entry, group.day, app, deps);
		}
	}
}
