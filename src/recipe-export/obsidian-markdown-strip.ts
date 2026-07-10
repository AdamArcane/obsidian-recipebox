/**
 * Strips Obsidian-specific markdown syntax from arbitrary prose so exported
 * text reads cleanly outside the vault. Tags and dataview inline fields are
 * left as-is for v1 -- they're harmless as plain text in a non-Obsidian context.
 */

// Embeds must be handled before the wikilink pattern below, otherwise the
// leading "!" is left dangling once "[[...]]" is consumed.
const EMBED_RE = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
const CALLOUT_RE = /^(\s*>\s*)\[!\w+\][+-]?\s?(.*)$/;

export function stripObsidianMarkdown(text: string): string {
	let result = text.replace(EMBED_RE, (_match, target: string, alias?: string) => {
		const label = (alias ?? target).trim();
		return `![${label}](${target.trim()})`;
	});

	result = result.replace(WIKILINK_RE, (_match, target: string, alias?: string) =>
		(alias ?? target).trim()
	);

	// Callouts: "> [!note] Title" -> "> Title", flattened to a plain blockquote.
	result = result
		.split("\n")
		.map((line) => {
			const match = line.match(CALLOUT_RE);
			if (!match) return line;
			const [, prefix, title] = match;
			return title ? `${prefix}${title}` : prefix.trimEnd();
		})
		.join("\n");

	return result;
}
