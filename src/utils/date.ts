/** Generates a short unique ID suitable for meal plan entries. */
export function generateEntryId(): string {
	return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function localDateISO(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}
