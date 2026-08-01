/**
 * Decides how a recipe's source frontmatter value should be presented: as a
 * clickable web link, or as plain text. Kept free of DOM calls so the rule set
 * can be unit tested and shared by every surface that shows a source.
 */

export interface SourceLinkDisplay {
	/** What the user sees: the hostname for web links, the raw value otherwise. */
	label: string;
	/** Set only for usable http(s) URLs; null means render as plain text. */
	href: string | null;
}

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

	if (!WEB_URL_RE.test(trimmed)) return { label: trimmed, href: null };

	const hostname = parseHostname(trimmed);
	// A malformed http(s) value such as a bare "https://" parses to nothing
	// usable. Showing the raw text beats rendering a link that goes nowhere.
	if (hostname === null) return { label: trimmed, href: null };

	return { label: hostname, href: trimmed };
}
