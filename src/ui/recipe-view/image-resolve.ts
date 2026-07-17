/**
 * Resolves a recipe's hero image value (URL, wikilink, or vault path) to a
 * displayable resource URL and renders it inside a card element.
 */
import { App, TFile } from "obsidian";
import { stripWikilink } from "../../utils/wikilink-strip";
import { makeLightboxable } from "../components/lightbox";

export const ABSOLUTE_URL_RE = /^(?:https?|data|app|capacitor):\/\//i;

export function resolveImagePath(app: App, imageValue: string): string | null {
	if (ABSOLUTE_URL_RE.test(imageValue)) return imageValue;

	const resolved = resolveImageFile(app, imageValue);
	return resolved ? app.vault.getResourcePath(resolved) : null;
}

// Same resolution as resolveImagePath, but returns the TFile itself rather than
// a display URL -- callers that need real bytes (export bundling) can pass this
// to app.vault.readBinary(). Returns null for external URLs, which have no TFile.
export function resolveImageFile(app: App, imageValue: string): TFile | null {
	if (ABSOLUTE_URL_RE.test(imageValue)) return null;

	// Unwrap wikilink/embed syntax to get bare path
	const bare = stripWikilink(imageValue);

	// Try Obsidian's link resolution first (handles shortened wikilinks)
	const resolved = app.metadataCache.getFirstLinkpathDest(bare, "");
	if (resolved instanceof TFile) return resolved;

	// Fallback: direct vault path lookup
	const byPath = app.vault.getFileByPath(bare);
	if (byPath instanceof TFile) return byPath;

	return null;
}

export function renderImageCard(container: HTMLElement, app: App, imageValue: string): void {
	const src = resolveImagePath(app, imageValue);
	const card = container.createDiv({ cls: "rb-image-card" });
	if (!src) {
		card.createDiv({ cls: "rb-image-placeholder" });
		return;
	}
	const img = card.createEl("img", { cls: "rb-recipe-image", attr: { src } });
	makeLightboxable(img);
	img.onerror = () => {
		img.remove();
		card.createDiv({ cls: "rb-image-placeholder" });
	};
}
