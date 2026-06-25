/**
 * Formats a seconds count as a MM:SS or H:MM:SS display string and parses
 * human-readable timer input back to seconds.
 */
function pad(n: number): string { return String(n).padStart(2, "0"); }

export function formatTime(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function parseTimeInput(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	// H:MM:SS
	const hms = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
	if (hms) {
		const m = parseInt(hms[2], 10);
		const s = parseInt(hms[3], 10);
		if (m >= 60 || s >= 60) return null;
		const total = parseInt(hms[1], 10) * 3600 + m * 60 + s;
		return total > 0 ? total : null;
	}

	// MM:SS
	const ms = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
	if (ms) {
		const s = parseInt(ms[2], 10);
		if (s >= 60) return null;
		const total = parseInt(ms[1], 10) * 60 + s;
		return total > 0 ? total : null;
	}

	// Bare number → whole minutes (decimal allowed)
	const bare = trimmed.match(/^(\d+(?:\.\d+)?)$/);
	if (bare) {
		const total = Math.round(parseFloat(bare[1]) * 60);
		return total > 0 ? total : null;
	}

	return null;
}
