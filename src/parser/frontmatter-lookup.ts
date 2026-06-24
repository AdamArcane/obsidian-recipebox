export function findValue(
	frontmatter: Record<string, unknown>,
	candidateKeys: string[],
): unknown {
	const lowerKeyMap = new Map<string, string>();
	for (const k of Object.keys(frontmatter)) {
		lowerKeyMap.set(k.toLowerCase(), k);
	}
	for (const candidate of candidateKeys) {
		const actualKey = lowerKeyMap.get(candidate.toLowerCase());
		if (actualKey !== undefined) {
			const value = frontmatter[actualKey];
			if (value !== null && value !== undefined) return value;
		}
	}
	return undefined;
}
