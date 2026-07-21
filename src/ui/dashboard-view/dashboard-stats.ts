/**
 * Pure, DOM-free stat computation for the dashboard view. Reads only cached
 * frontmatter (readRecipeMeta) for the cheap per-card stats, and only reaches
 * for readCookHistory's entry-level detail for the cooking-activity chart,
 * which is the one place granular data earns its cost (see dashboard-spec.md
 * section 11.2).
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings, DashboardActivityRangeWeeks } from "../../settings/settings-types";
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

export type ActivityGranularity = "day" | "week";

export interface CookingActivityBucket {
	bucketStart: string; // ISO date -- the day itself (daily) or its Monday (weekly)
	count: number;
	entries: { file: TFile; date: string }[]; // for the per-bucket detail popover
}

export interface CookingActivityResult {
	granularity: ActivityGranularity;
	buckets: CookingActivityBucket[];
}

// "Finer granularity" (daily bars) and "go back further" (up to 12 weeks) pull
// in opposite directions for legibility -- 12 weeks of daily bars would be 84
// bars in a chart meant to be readable at a glance. Granularity follows the
// selected range rather than being a separate control (see dashboard-spec.md
// section 13.2's table).
export function granularityForRange(rangeWeeks: DashboardActivityRangeWeeks): ActivityGranularity {
	return rangeWeeks <= 4 ? "day" : "week";
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
	rangeWeeks: DashboardActivityRangeWeeks,
): CookingActivityResult {
	const granularity = granularityForRange(rangeWeeks);
	const today = new Date();
	const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

	const buckets = new Map<string, CookingActivityBucket>();
	if (granularity === "day") {
		const totalDays = rangeWeeks * 7;
		for (let i = totalDays - 1; i >= 0; i--) {
			const d = new Date(todayMidnight);
			d.setDate(d.getDate() - i);
			const key = formatLocalISO(d);
			buckets.set(key, { bucketStart: key, count: 0, entries: [] });
		}
	} else {
		const thisWeekMonday = mondayOf(todayMidnight);
		for (let i = rangeWeeks - 1; i >= 0; i--) {
			const d = new Date(thisWeekMonday);
			d.setDate(d.getDate() - i * 7);
			const key = formatLocalISO(d);
			buckets.set(key, { bucketStart: key, count: 0, entries: [] });
		}
	}

	// Cook history is opt-in; skip the per-file read entirely when it's off
	// rather than looping to collect nothing (see dashboard-spec.md section 11.2).
	if (settings.cookHistoryEnabled) {
		const earliestKey = [...buckets.keys()][0];
		for (const file of files) {
			for (const entry of readCookHistory(app, file, settings)) {
				const entryDate = new Date(entry.date + "T00:00:00");
				if (isNaN(entryDate.getTime())) continue;
				const key = granularity === "day" ? entry.date : formatLocalISO(mondayOf(entryDate));
				if (key < earliestKey) continue;
				const bucket = buckets.get(key);
				if (!bucket) continue;
				bucket.count += 1;
				bucket.entries.push({ file, date: entry.date });
			}
		}
	}

	return { granularity, buckets: [...buckets.values()] };
}
