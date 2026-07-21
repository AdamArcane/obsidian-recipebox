/**
 * Renders the dashboard's hero slot (cooking-activity chart, or a
 * "Recently made" list when cook history tracking is off) and the stacked
 * stat cards beside it. See dashboard-spec.md sections 3 and 11.2-11.4.
 */
import { RecipeBoxSettings } from "../../settings/settings-types";
import { DashboardStats, WeeklyActivity } from "./dashboard-stats";
import { renderBarChart } from "./chart-bars";
import { daysSince } from "../../utils/date-distance";

export interface StatsRowActions {
	openGalleryView: () => void;
	openRecipe: (path: string) => void;
}

function formatLastMade(iso: string): string {
	const days = daysSince(iso);
	if (days === null) return iso;
	if (days === 0) return "Made today";
	if (days === 1) return "Made yesterday";
	return `Made ${days}d ago`;
}

function renderRecentlyMadeFallback(hero: HTMLElement, stats: DashboardStats, actions: StatsRowActions): void {
	hero.createDiv({ cls: "rb-dashboard-card-label", text: "Recently made" });
	if (stats.recentlyMade.length === 0) {
		hero.createDiv({ cls: "rb-dashboard-empty-text", text: "Nothing marked cooked yet." });
		return;
	}
	const list = hero.createDiv({ cls: "rb-dashboard-recently-made-list" });
	for (const entry of stats.recentlyMade) {
		const row = list.createDiv({ cls: "rb-dashboard-recently-made-row", attr: { role: "button", tabindex: "0" } });
		row.createSpan({ cls: "rb-dashboard-recently-made-name", text: entry.file.basename });
		row.createSpan({ cls: "rb-dashboard-recently-made-date", text: formatLastMade(entry.lastMade) });
		row.addEventListener("click", () => actions.openRecipe(entry.file.path));
	}
}

function renderHero(
	grid: HTMLElement,
	stats: DashboardStats,
	activity: WeeklyActivity[],
	settings: RecipeBoxSettings,
	actions: StatsRowActions,
): void {
	const hero = grid.createDiv({ cls: "rb-dashboard-card rb-dashboard-hero rb-dashboard-span-8" });
	if (!settings.cookHistoryEnabled) {
		renderRecentlyMadeFallback(hero, stats, actions);
		return;
	}
	hero.createDiv({ cls: "rb-dashboard-card-label", text: "Cooking activity (last 8 weeks)" });
	renderBarChart(hero, activity.map((a) => ({ label: a.weekStart, value: a.count })));
}

function renderStatCards(grid: HTMLElement, stats: DashboardStats, actions: StatsRowActions): void {
	const col = grid.createDiv({ cls: "rb-dashboard-stats-col rb-dashboard-span-4" });

	const totalCard = col.createDiv({ cls: "rb-dashboard-card rb-dashboard-stat-card rb-dashboard-stat-card--number", attr: { role: "button", tabindex: "0" } });
	totalCard.createDiv({ cls: "rb-dashboard-stat-number", text: String(stats.totalRecipes) });
	totalCard.createDiv({ cls: "rb-dashboard-card-label", text: "recipes in your vault" });
	totalCard.addEventListener("click", () => actions.openGalleryView());

	const cookedCard = col.createDiv({ cls: "rb-dashboard-card rb-dashboard-stat-card" });
	cookedCard.createDiv({ cls: "rb-dashboard-card-label", text: "Most cooked" });
	if (!stats.mostCooked) {
		cookedCard.createDiv({ cls: "rb-dashboard-empty-text", text: "Cook something to see it here." });
	} else {
		const { file, cookedCount } = stats.mostCooked;
		const row = cookedCard.createDiv({ cls: "rb-dashboard-most-cooked-row", attr: { role: "button", tabindex: "0" } });
		row.createSpan({ cls: "rb-dashboard-most-cooked-name", text: file.basename });
		row.createSpan({ cls: "rb-dashboard-most-cooked-count", text: `${cookedCount}×` });
		row.addEventListener("click", () => actions.openRecipe(file.path));
	}
}

export function renderStatsRow(
	grid: HTMLElement,
	stats: DashboardStats,
	activity: WeeklyActivity[],
	settings: RecipeBoxSettings,
	actions: StatsRowActions,
): void {
	renderHero(grid, stats, activity, settings, actions);
	renderStatCards(grid, stats, actions);
}
