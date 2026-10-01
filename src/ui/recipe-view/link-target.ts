/**
 * Pure helper that reads the note a rendered internal link points at. Kept
 * free of Obsidian imports so it can be unit tested.
 */

/**
 * `data-href` is what Obsidian writes for wikilinks and is already decoded.
 * A Markdown link like [Text](Note%20Name.md) may only carry the raw `href`,
 * which is percent-encoded, so decode that fallback. A malformed escape
 * ("%E0%A4%A") makes decodeURIComponent throw; use the raw text then rather
 * than leaving the link dead.
 */
export function linkTargetFromAttributes(dataHref: string | null, href: string | null): string | null {
	const direct = dataHref?.trim();
	if (direct) return direct;
	const raw = href?.trim();
	if (!raw) return null;
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

/** Splits "Folder/Note#Heading" into the file path and the "#..." suffix. */
export function splitLinkpath(linktext: string): string {
	const hash = linktext.indexOf("#");
	return hash === -1 ? linktext : linktext.slice(0, hash);
}
