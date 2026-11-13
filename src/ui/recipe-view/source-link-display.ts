/**
 * Decides how a recipe's source frontmatter value should be presented: as a
 * clickable web link, a link to a note in the vault, or plain text. Kept free
 * of DOM calls so the rule set can be unit tested and shared by every surface
 * that shows a source.
 */

import { parseWholeWikilink } from "../../utils/wikilink-display";
import type { ParsedWikilink } from "../../utils/wikilink-display";

/**
 * A `source` value that is non-interactive text
 */
type SourceTextDisplay = { kind: 'text', label: string };

/**
 * A `source` value that is a wikilink to a note in the vault
 */
type SourceWikiLinkDisplay = { kind: 'internal' } & ParsedWikilink;

/**
 * A `source` value that is a usable http(s) URL, labelled with its hostname.
 */
type SourceExternalLinkDisplay = { kind: 'external', label: string, href: string }

export type SourceLinkDisplay =
	SourceTextDisplay | SourceWikiLinkDisplay | SourceExternalLinkDisplay

// Only http(s) is offered as a link, and the scheme test comes before any
// parsing. Parsing alone would be the wrong gate: other schemes parse happily
// but yield a misleading label -- new URL("obsidian://open?x=1") reports a
// hostname of "open", and mailto: reports an empty string. A source that is not
// a web address (a cookbook title, a person, a bare domain) is still worth
// showing, just not as something clickable.
const WEB_URL_RE = /^https?:\/\//i;

function parseHostname(url: string): string | null {
	try {
		const { hostname } = new URL(url);
		return hostname.length > 0 ? hostname : null;
	} catch {
		return null;
	}
}

export function describeSourceLink(rawValue: string | null): SourceLinkDisplay | null {
	if (rawValue === null) return null;
	const trimmed = rawValue.trim();
	if (!trimmed) return null;

	// A source like "[[Kate|my sister]]" used to fall through to plain text and
	// show the raw brackets. Only a value that is entirely one wikilink counts;
	// free text that merely mentions a note is still shown as written.
	const wikilink = parseWholeWikilink(trimmed);
	if (wikilink) return { kind: "internal", label: wikilink.label, linktext: wikilink.linktext };

	if (!WEB_URL_RE.test(trimmed)) return { kind: "text", label: trimmed };

	const hostname = parseHostname(trimmed);
	// A malformed http(s) value such as a bare "https://" parses to nothing
	// usable. Showing the raw text beats rendering a link that goes nowhere.
	if (hostname === null) return { kind: "text", label: trimmed };

	return { kind: "external", label: hostname, href: trimmed };
}
