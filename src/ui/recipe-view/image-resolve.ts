/**
 * Resolves a recipe's hero image value (URL, wikilink, or vault path) to a
 * displayable resource URL and renders it inside a card element.
 */
import { App, TFile } from "obsidian";
import { stripWikilink } from "../../utils/wikilink-strip";
import { makeLightboxable } from "../components/lightbox";

const ABSOLUTE_URL_RE = /^(?:https?|data|app|capacitor):\/\//i;

export function resolveImagePath(app: App, imageValue: string): string | null {
	if (ABSOLUTE_URL_RE.test(imageValue)) return imageValue;

	// Unwrap wikilink/embed syntax to get bare path
	const bare = stripWikilink(imageValue);

	// Try Obsidian's link resolution first (handles shortened wikilinks)
	const resolved = app.metadataCache.getFirstLinkpathDest(bare, "");
	if (resolved instanceof TFile) {
		return app.vault.getResourcePath(resolved);
	}

	// Fallback: direct vault path lookup
	const byPath = app.vault.getFileByPath(bare);
	if (byPath instanceof TFile) {
		return app.vault.getResourcePath(byPath);
	}

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
