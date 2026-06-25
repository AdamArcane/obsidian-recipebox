/**
 * Recursively collects all Markdown files from a vault folder tree, optionally
 * filtered to the configured recipe folders.
 */
import { App, TFile, TFolder } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";

export function collectMarkdownFiles(folder: TFolder): TFile[] {
	const results: TFile[] = [];
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === "md") {
			results.push(child);
		} else if (child instanceof TFolder) {
			results.push(...collectMarkdownFiles(child));
		}
	}
	return results;
}

export function listMarkdownFilesInRecipeFolders(
	app: App,
	settings: RecipeBoxSettings
): TFile[] {
	const paths = settings.recipeFolders.filter(Boolean);
	if (paths.length === 0) {
		const root = app.vault.getRoot();
		return collectMarkdownFiles(root);
	}

	const seen = new Set<string>();
	const files: TFile[] = [];

	for (const folderPath of paths) {
		if (seen.has(folderPath)) continue;
		seen.add(folderPath);
		const folder = app.vault.getFolderByPath(folderPath);
		if (folder) files.push(...collectMarkdownFiles(folder));
	}

	return files;
}
