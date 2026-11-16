/**
 * Pure helper that copies day and meal type from the meal plan note onto saved
 * entries for one recipe. Handles a recipe placed on several days by matching
 * unchanged slots first, so only genuine moves are applied.
 */
import { MealPlanEntry } from "../types";

export interface NoteSlot {
	day: string | undefined;
	mealType: string | undefined;
}

const QUEUE = "meal plan queue";

// A missing day and the "Meal Plan Queue" heading both mean "unscheduled".
const dayKey = (d: string | undefined): string => (d?.trim() || QUEUE).toLowerCase();
const mealKey = (m: string | undefined): string => (m ?? "").trim().toLowerCase();

const sameSlot = (e: MealPlanEntry, s: NoteSlot): boolean => dayKey(e.day) === dayKey(s.day) && mealKey(e.meal) === mealKey(s.mealType);

/**
 * Returns true when any entry was changed. `entries` are the saved entries for
 * one recipe path, `slots` the lines for that recipe in the note.
 *
 * Why unmatched leftovers are only paired when the counts agree: with 2 saved
 * entries and 3 note lines (or the reverse) there is no way to know which
 * entry a line belongs to. Adding and removing entries is handled elsewhere,
 * so here we leave the schedule alone rather than guess and move the wrong one.
 */
export function reconcileSlots(entries: MealPlanEntry[], slots: NoteSlot[]): boolean {
	const freeEntries = [...entries];
	const freeSlots = [...slots];

	for (const entry of [...freeEntries]) {
		const i = freeSlots.findIndex((s) => sameSlot(entry, s));
		if (i < 0) continue;
		freeSlots.splice(i, 1);
		freeEntries.splice(freeEntries.indexOf(entry), 1);
	}
	if (freeEntries.length === 0 || freeEntries.length !== freeSlots.length) return false;

	freeEntries.forEach((entry, i) => {
		const slot = freeSlots[i];
		// The queue is stored as "no day", which is what the UI writes itself.
		entry.day = dayKey(slot.day) === QUEUE ? undefined : slot.day?.trim();
		entry.meal = slot.mealType?.trim() || undefined;
	});
	return true;
}
