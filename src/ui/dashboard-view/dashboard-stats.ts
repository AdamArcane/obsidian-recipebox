/**
 * Pure, DOM-free stat computation for the dashboard view. Reads only cached
 * frontmatter (readRecipeMeta) for the cheap per-card stats, and only reaches
 * for readCookHistory's entry-level detail for the cooking-activity chart,
 * which is the one place granular data earns its cost (see dashboard-spec.md
 * section 11.2).
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { readRecipeMeta, formatLocalISO } from "../../parser/recipe-meta-read";
import { readCookHistory } from "../../recipe-history/cook-history";

export interface RecentlyMadeEntry {
	file: TFile;
	lastMade: string;
}

export interface MostCookedEntry {
	file: TFile;
	cookedCount: number;
}

export interface DashboardStats {
	totalRecipes: number;
	recentlyMade: RecentlyMadeEntry[];
	mostCooked: MostCookedEntry | null;
}

export interface WeeklyActivity {
	weekStart: string; // ISO date, Monday of that week
	count: number;
}

export function computeDashboardStats(
	app: App,
	files: TFile[],
	settings: RecipeBoxSettings,
): DashboardStats {
	const withMeta = files.map((file) => ({
		file,
		meta: readRecipeMeta(app.metadataCache.getFileCache(file), settings),
	}));

	const recentlyMade = withMeta
		.filter((x): x is typeof x & { meta: { lastMade: string } } => x.meta.lastMade !== null)
		.sort((a, b) => b.meta.lastMade.localeCompare(a.meta.lastMade))
		.slice(0, 3)
		.map((x) => ({ file: x.file, lastMade: x.meta.lastMade }));

	const cookedFiles = withMeta.filter((x) => x.meta.cookedCount > 0).sort((a, b) => b.meta.cookedCount - a.meta.cookedCount);
	const mostCooked = cookedFiles.length > 0 ? { file: cookedFiles[0].file, cookedCount: cookedFiles[0].meta.cookedCount } : null;

	return { totalRecipes: files.length, recentlyMade, mostCooked };
}

// Monday-anchored so a week's bucket key is stable regardless of which day
// within it an entry falls on.
function mondayOf(date: Date): Date {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const daysSinceMonday = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - daysSinceMonday);
	return d;
}

export function computeCookingActivity(
	app: App,
	files: TFile[],
	settings: RecipeBoxSettings,
	weeks = 8,
): WeeklyActivity[] {
	const thisWeekMonday = mondayOf(new Date());
	const buckets = new Map<string, number>();
	for (let i = weeks - 1; i >= 0; i--) {
		const d = new Date(thisWeekMonday);
		d.setDate(d.getDate() - i * 7);
		buckets.set(formatLocalISO(d), 0);
	}

	// Cook history is opt-in; skip the per-file read entirely when it's off
	// rather than looping to collect nothing (see dashboard-spec.md section 11.2).
	if (!settings.cookHistoryEnabled) return [...buckets.entries()].map(([weekStart, count]) => ({ weekStart, count }));

	const earliestWeek = [...buckets.keys()][0];
	for (const file of files) {
		for (const entry of readCookHistory(app, file, settings)) {
			const entryDate = new Date(entry.date + "T00:00:00");
			if (isNaN(entryDate.getTime())) continue;
			const weekKey = formatLocalISO(mondayOf(entryDate));
			if (weekKey < earliestWeek) continue;
			if (buckets.has(weekKey)) buckets.set(weekKey, (buckets.get(weekKey) ?? 0) + 1);
		}
	}

	return [...buckets.entries()].map(([weekStart, count]) => ({ weekStart, count }));
}
