/**
 * Scheduling algorithm for bulk-assigning a batch of recipes across the week
 * (used by the Schedule Recipes modal). Availability is checked against a
 * snapshot of the meal plan taken once up front and updated locally as
 * recipes are placed, so earlier placements in the same batch affect later
 * availability checks without depending on save/refresh timing.
 */
import { MealPlanEntry } from "../types";

export const SCHEDULE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type FillMode = "skip-occupied" | "one-per-meal-type" | "stack-freely" | "queue-only";

export interface ScheduleOptions {
	mealType: string | undefined;
	fillMode: FillMode;
	overflowToQueue: boolean;
}

/** Write operations the algorithm needs; kept minimal so it doesn't depend on the manager or modal UI. */
export interface ScheduleWriteOps {
	addMealPlanEntry: (recipePath: string, day?: string) => Promise<string>;
	setMealType: (id: string, mealType: string | undefined) => Promise<void>;
}

export function isDayAvailable(day: string, mealType: string | undefined, fillMode: FillMode, plan: MealPlanEntry[]): boolean {
	const dayEntries = plan.filter((e) => e.day?.toLowerCase() === day.toLowerCase());
	if (fillMode === "skip-occupied") return dayEntries.length === 0;
	if (fillMode === "one-per-meal-type") {
		// No meal type given: fall back to "skip-occupied" since there's nothing to distinguish by.
		if (!mealType) return dayEntries.length === 0;
		return !dayEntries.some((e) => e.meal?.toLowerCase() === mealType.toLowerCase());
	}
	// Stack freely has no occupancy concept — every day is "available" by definition.
	// Never used to pick a day (see scheduleRecipes' stackIndex instead); kept here
	// only so isDayAvailable stays a total function over every FillMode.
	return true;
}

function findTargetDay(mealType: string | undefined, fillMode: FillMode, plan: MealPlanEntry[]): string | null {
	for (const day of SCHEDULE_DAYS) {
		if (isDayAvailable(day, mealType, fillMode, plan)) return day;
	}
	return null;
}

export async function scheduleRecipes(
	recipePaths: string[],
	initialPlan: MealPlanEntry[],
	ops: ScheduleWriteOps,
	opts: ScheduleOptions,
): Promise<void> {
	const planSnapshot = [...initialPlan];
	// Stack freely ignores occupancy entirely, so it can't reuse findTargetDay
	// (which always returns the first "available" day — with no occupancy check,
	// that's always Monday). It just cycles Monday..Sunday..Monday by count instead.
	let stackIndex = 0;

	for (const recipePath of recipePaths) {
		// Queue-only is a deliberate "skip day placement entirely" mode, distinct
		// from the overflow fallback below: it still honors the chosen meal type,
		// where overflow (day placement failed) intentionally does not.
		if (opts.fillMode === "queue-only") {
			const id = await ops.addMealPlanEntry(recipePath, undefined);
			if (opts.mealType) await ops.setMealType(id, opts.mealType);
			continue;
		}

		const targetDay = opts.fillMode === "stack-freely"
			? SCHEDULE_DAYS[stackIndex++ % SCHEDULE_DAYS.length]
			: findTargetDay(opts.mealType, opts.fillMode, planSnapshot);

		if (targetDay !== null) {
			const id = await ops.addMealPlanEntry(recipePath, targetDay);
			if (opts.mealType) await ops.setMealType(id, opts.mealType);
			planSnapshot.push({ id, recipePath, day: targetDay, meal: opts.mealType, addedDate: "", contributions: {} });
		} else if (opts.overflowToQueue) {
			// Overflow entries go to the queue unscheduled — no meal type is set,
			// matching the queue's existing "day-less" semantics.
			await ops.addMealPlanEntry(recipePath, undefined);
		}
		// else: no day available and overflow disabled — skip silently.
	}
}
