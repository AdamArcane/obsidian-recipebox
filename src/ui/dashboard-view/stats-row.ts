/**
 * Renders the dashboard's hero slot (cooking-activity chart, or a
 * "Recently made" list when cook history tracking is off) and the stacked
 * stat cards beside it. See dashboard-spec.md sections 3, 11.2-11.4, 13.2.
 */
import { Menu } from "obsidian";
import { RecipeBoxSettings, DashboardActivityRangeWeeks } from "../../settings/settings-types";
import { DashboardStats, CookingActivityResult, CookingActivityBucket, ActivityGranularity } from "./dashboard-stats";
import { renderBarChart, BarChartBar } from "./chart-bars";
import { daysSince } from "../../utils/date-distance";

export interface StatsRowActions {
	openGalleryView: () => void;
	openRecipe: (path: string) => void;
	activityRangeWeeks: DashboardActivityRangeWeeks;
	onActivityRangeChange: (weeks: DashboardActivityRangeWeeks) => void;
}

const RANGE_OPTIONS: DashboardActivityRangeWeeks[] = [2, 4, 8, 12];

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

function formatAxisLabel(bucketStart: string, granularity: ActivityGranularity): string {
	const d = new Date(bucketStart + "T00:00:00");
	if (isNaN(d.getTime())) return bucketStart;
	if (granularity === "day") return d.toLocaleDateString(undefined, { weekday: "short" });
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHoverLabel(bucket: CookingActivityBucket, granularity: ActivityGranularity): string {
	const d = new Date(bucket.bucketStart + "T00:00:00");
	const dateStr = isNaN(d.getTime()) ? bucket.bucketStart : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
	const prefix = granularity === "week" ? `Week of ${dateStr}` : dateStr;
	return `${prefix}: ${bucket.count} cooked`;
}

// Reuses the same lightweight-popover pattern as the meal plan mini-grid's
// day popover (an Obsidian Menu) rather than building a second tooltip
// mechanism -- see meal-plan-mini-grid.ts's openDayMenu.
function openBucketMenu(evt: MouseEvent, bucket: CookingActivityBucket, openRecipe: (path: string) => void): void {
	const counts = new Map<string, { path: string; name: string; count: number }>();
	for (const entry of bucket.entries) {
		const existing = counts.get(entry.file.path);
		if (existing) existing.count += 1;
		else counts.set(entry.file.path, { path: entry.file.path, name: entry.file.basename, count: 1 });
	}
	const menu = new Menu();
	for (const { path, name, count } of counts.values()) {
		menu.addItem((item) =>
			item.setTitle(count > 1 ? `${name} (${count}×)` : name)
				.setIcon("utensils")
				.onClick(() => openRecipe(path))
		);
	}
	menu.showAtMouseEvent(evt);
}

function renderRangeSelect(container: HTMLElement, current: DashboardActivityRangeWeeks, onChange: (weeks: DashboardActivityRangeWeeks) => void): void {
	const select = container.createEl("select", { cls: "rb-dashboard-chart-range-select" });
	for (const weeks of RANGE_OPTIONS) {
		const opt = select.createEl("option", { value: String(weeks), text: `${weeks} weeks` });
		if (weeks === current) opt.selected = true;
	}
	select.addEventListener("change", () => {
		const weeks = Number(select.value) as DashboardActivityRangeWeeks;
		onChange(weeks);
	});
}

function renderHero(
	grid: HTMLElement,
	stats: DashboardStats,
	activity: CookingActivityResult,
	settings: RecipeBoxSettings,
	actions: StatsRowActions,
): void {
	const hero = grid.createDiv({ cls: "rb-dashboard-card rb-dashboard-hero rb-dashboard-span-8" });
	if (!settings.cookHistoryEnabled) {
		renderRecentlyMadeFallback(hero, stats, actions);
		return;
	}

	const labelRow = hero.createDiv({ cls: "rb-dashboard-chart-label-row" });
	labelRow.createDiv({ cls: "rb-dashboard-card-label", text: "Cooking activity" });
	renderRangeSelect(labelRow, actions.activityRangeWeeks, actions.onActivityRangeChange);

	const bars: BarChartBar[] = activity.buckets.map((bucket) => ({
		axisLabel: formatAxisLabel(bucket.bucketStart, activity.granularity),
		hoverLabel: formatHoverLabel(bucket, activity.granularity),
		value: bucket.count,
		onClick: bucket.entries.length > 0 ? (evt) => openBucketMenu(evt, bucket, actions.openRecipe) : undefined,
	}));
	// Only the dense 28-bar (4-week, daily) case needs every-other-bar
	// labeling; 14 daily bars (2-week) and the weekly cases (8/12 bars) aren't
	// crowded enough to need it (see dashboard-spec.md section 13.2).
	const labelEvery = activity.granularity === "day" && bars.length > 14 ? 2 : 1;
	renderBarChart(hero, bars, { labelEvery });
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
	activity: CookingActivityResult,
	settings: RecipeBoxSettings,
	actions: StatsRowActions,
): void {
	renderHero(grid, stats, activity, settings, actions);
	renderStatCards(grid, stats, actions);
}
