/**
 * Date and ID utilities: generates short unique IDs for meal plan entries and
 * returns today's date as YYYY-MM-DD in the user's local timezone.
 */
/** Generates a short unique ID suitable for meal plan entries. */
export function generateEntryId(): string {
	return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

/** Returns a date as YYYY-MM-DD in the user's local timezone, defaulting to today. */
export function localDateISO(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
