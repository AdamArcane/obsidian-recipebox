/**
 * Marks recipe folders in the core file explorer with a dotted underline
 * when folder-click-opens-gallery is on -- a signal that clicking the
 * folder goes somewhere, the same idea folder-note plugins use.
 *
 * Obsidian's plugin-review rules forbid dynamically creating/attaching
 * <style> elements (obsidianmd/no-forbidden-elements), which rules out
 * generating per-folder CSS attribute-selector rules at runtime. Instead
 * this toggles a plain CSS class (rb-folder-gallery-link, styled statically
 * in styles.css) directly on the matching .nav-folder-title-content
 * elements. Re-run from a handful of real structural-change events
 * (vault create/rename/delete, workspace layout-change, settings save) --
 * see register-folder-click-gallery.ts -- rather than a MutationObserver
 * watching every explorer redraw.
 */
import RecipeBoxPlugin from "../main";
import { isFolderClickGalleryTarget } from "./folder-click-match";

const UNDERLINE_CLASS = "rb-folder-gallery-link";

export function clearFolderClickUnderlines(): void {
	activeDocument.querySelectorAll(`.${UNDERLINE_CLASS}`).forEach((el) => el.removeClass(UNDERLINE_CLASS));
}

export function refreshFolderClickUnderlines(plugin: RecipeBoxPlugin): void {
	clearFolderClickUnderlines();
	if (!plugin.settings.openGalleryOnFolderClick) return;

	activeDocument.querySelectorAll(".nav-folder-title[data-path]").forEach((row) => {
		const folderPath = row.getAttribute("data-path");
		if (!folderPath) return;
		if (!isFolderClickGalleryTarget(folderPath, plugin.settings)) return;

		const content = row.querySelector(".nav-folder-title-content");
		content?.addClass(UNDERLINE_CLASS);
	});
}
