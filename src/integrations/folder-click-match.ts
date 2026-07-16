/**
 * Pure membership check shared by the core-explorer and Notebook Navigator
 * folder-click adapters: does clicking this folder path qualify as a
 * gallery-open target? Exact matches against a configured recipe folder
 * always qualify (when the master toggle is on); subfolder matches only
 * qualify when the "also apply to subfolders" toggle is also on.
 */
import { RecipeBoxSettings } from "../settings/settings-types";

// Exported so folder-click-style.ts's underline CSS generator normalizes
// recipeFolders paths identically to the membership check below -- the
// underline should always agree with what a click would actually open.
export function normalizeFolderPath(path: string): string {
	return path.replace(/\/$/, "");
}

export function isFolderClickGalleryTarget(folderPath: string, settings: RecipeBoxSettings): boolean {
	if (!settings.openGalleryOnFolderClick) return false;

	const target = normalizeFolderPath(folderPath);
	if (settings.recipeFolders.some((f) => normalizeFolderPath(f) === target)) return true;

	if (!settings.openGalleryOnFolderClickSubfolders) return false;
	return settings.recipeFolders.some((f) => target.startsWith(normalizeFolderPath(f) + "/"));
}
