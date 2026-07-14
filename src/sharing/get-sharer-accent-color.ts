/**
 * Reads the sharer's live Obsidian theme accent color so the shared page can
 * echo it instead of a single hardcoded guess. Themes (default or custom)
 * set --interactive-accent on the document body via their own CSS, so
 * reading the *computed* value picks up whatever the sharer is actually
 * looking at right now, not a static default.
 */
export function getSharerAccentColor(): string | null {
	const value = getComputedStyle(activeDocument.body).getPropertyValue("--interactive-accent").trim();
	return value || null;
}
