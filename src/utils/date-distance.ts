export function daysSince(isoDateString: string): number | null {
	const parts = isoDateString.split("-");
	if (parts.length !== 3) return null;
	const [year, month, day] = parts.map(Number);
	if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;

	const then = new Date(year, month - 1, day);
	if (isNaN(then.getTime())) return null;

	const now = new Date();
	const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const thenMidnight = new Date(then.getFullYear(), then.getMonth(), then.getDate());

	return Math.round((todayMidnight.getTime() - thenMidnight.getTime()) / 86400000);
}
