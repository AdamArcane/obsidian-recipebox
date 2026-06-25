/** Strips Obsidian wikilink/embed syntax from a value, returning the bare file path. */
const WIKILINK_RE = /^!?\[\[([^\]#|]+)(?:[#|][^\]]*)?]]/;

export function stripWikilink(value: string): string {
	const m = value.match(WIKILINK_RE);
	return m ? m[1].trim() : value;
}
