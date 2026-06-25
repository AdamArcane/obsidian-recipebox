/**
 * Derives a grocery category from an ingredient's inline tags by picking the
 * most-frequent tag, falling back to the earliest occurrence on a tie.
 */
export function pickTagCategory(tags: string[] | undefined): string | null {
	if (!tags || tags.length === 0) return null;

	const counts = new Map<string, number>();
	const firstSeen = new Map<string, string>();

	for (const tag of tags) {
		const key = tag.trim().toLowerCase();
		if (!key) continue;
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (!firstSeen.has(key)) firstSeen.set(key, tag.trim());
	}

	if (counts.size === 0) return null;

	let bestKey = "";
	let bestCount = 0;
	let bestIndex = Infinity;

	for (const [key, count] of counts) {
		const index = tags.findIndex((t) => t.trim().toLowerCase() === key);
		if (
			count > bestCount ||
			(count === bestCount && index < bestIndex)
		) {
			bestKey = key;
			bestCount = count;
			bestIndex = index;
		}
	}

	const original = firstSeen.get(bestKey) ?? bestKey;
	return original.charAt(0).toUpperCase() + original.slice(1);
}
