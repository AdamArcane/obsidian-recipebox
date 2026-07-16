/**
 * Two-phase hero image resolution for gallery cards. Phase 1 (sync) reads
 * only frontmatter, already loaded in metadataCache. Phase 2 (lazy async)
 * reads file bodies one at a time -- only for cards phase 1 left empty --
 * so opening the gallery never triggers a full-vault read burst.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { frontmatterImageValue } from "../../parser/resolve-hero-image";
import { findFirstImageInBody } from "../../parser/recipe-body-clean";
import { stripFrontmatter } from "../../parser/recipe-frontmatter-strip";
import { resolveImagePath } from "../recipe-view/image-resolve";

/** Synchronous phase 1: frontmatter-only, no file read. */
export function getFrontmatterImageSrc(app: App, file: TFile, settings: RecipeBoxSettings): string | null {
	const cache = app.metadataCache.getFileCache(file);
	const value = frontmatterImageValue(cache?.frontmatter ?? {}, settings);
	return value ? resolveImagePath(app, value) : null;
}

/** Lazy phase 2: reads the file body to find its first embedded image. */
async function resolveBodyImageSrc(app: App, file: TFile, settings: RecipeBoxSettings): Promise<string | null> {
	if (!settings.useFirstBodyImageWhenFrontmatterEmpty) return null;
	const raw = await app.vault.cachedRead(file);
	const body = stripFrontmatter(raw);
	const value = findFirstImageInBody(body);
	return value ? resolveImagePath(app, value) : null;
}

/**
 * Runs the phase-2 lookup for `files` one at a time (not Promise.all -- that
 * would fire a read for every card missing a frontmatter image at once).
 * Calls `onResolved` as each file finishes; checks `isCancelled` before each
 * read and before each callback so a closed/re-rendered view doesn't keep
 * touching the vault or write into stale DOM.
 */
export async function runLazyImagePass(
	app: App,
	files: TFile[],
	settings: RecipeBoxSettings,
	onResolved: (file: TFile, src: string | null) => void,
	isCancelled: () => boolean,
): Promise<void> {
	for (const file of files) {
		if (isCancelled()) return;
		const src = await resolveBodyImageSrc(app, file, settings);
		if (isCancelled()) return;
		onResolved(file, src);
	}
}
