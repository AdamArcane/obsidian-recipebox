/**
 * Turns Obsidian wikilink syntax into the text Obsidian itself would display,
 * for labels shown as plain DOM text rather than through MarkdownRenderer.
 */

/**
 * Matches every wikilink in a string, embeds included.
 *
 * Group 1 is the target, group 2 the optional alias.
 */
const ALL_WIKILINKS_AND_EMBEDS_RE = /!?\[\[([^\]|]+)(?:\|([^\]]*))?]]/g;

/**
 * Matches a value that is exactly one wikilink, embeds excluded.
 *
 * Group 1 is the target, group 2 the optional alias.
 */
const SOLE_WIKILINK_RE = /^\[\[([^\]|]+)(?:\|([^\]]*))?]]$/;

/**
 * Returns the value to render when displaying a link to a note, when that link
 * cannot be interacted with
 *
 * @param target the file referenced by the link
 * @param alias optionally, the alias assigned to the link
 * @returns the text to display for the link
 */
function displayFor(target: string, alias: string | undefined): string {
  const trimmedAlias = alias?.trim();
  if (trimmedAlias) {
    return trimmedAlias;
  }

  return target
    .split("#")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" > ");
}

/**
 * Replaces every wikilink in {@linkcode text} with its display text, leaving the rest untouched.
 */
export function renderWikilinksAsText(text: string): string {
  return text.replace(
    ALL_WIKILINKS_AND_EMBEDS_RE,
    (_match, target: string, alias: string | undefined) =>
      displayFor(target, alias),
  );
}

export interface ParsedWikilink {
  /**
   * The link target as Obsidian's openLinkText expects it
   */
  linktext: string;

  /**
   * The value to render for the wiki link
   */
  label: string;
}

/**
 * Try to parse {@linkcode value} as a link to a file in the vault
 *
 * Returns `null` if `value` does not match the expected format
 */
export function parseWholeWikilink(value: string): ParsedWikilink | null {
  const m = value.trim().match(SOLE_WIKILINK_RE);
  if (!m) return null;

  const linktext = m[1].trim();
  if (!linktext) return null;

  return { linktext, label: displayFor(linktext, m[2]) };
}
