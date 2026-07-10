/**
 * Determines whether a vault file qualifies as a recipe and registers the
 * auto-open and file-menu context-menu hooks that act on qualifying files.
 */
import { App, MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { RECIPE_VIEW_TYPE } from "../ui/recipe-view/recipe-view";
import { listMarkdownFilesInRecipeFolders } from "../utils/vault-markdown-files";

function normalizeTypeValues(raw: unknown): string[] {
	const arr = Array.isArray(raw) ? raw : [raw];
	return arr.flatMap((v) => {
		if (typeof v !== "string") return [];
		return [v.replace(/^\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim().toLowerCase()];
	});
}

/** Folder-scope portion of recipe detection: is this file inside a configured recipe folder (or is scope unrestricted)? */
export function inRecipeFolderScope(file: TFile, settings: RecipeBoxSettings): boolean {
	return settings.recipeFolders.length === 0 || settings.recipeFolders.some((folder) => {
		const base = folder.replace(/\/$/, "");
		return file.path === base || file.path.startsWith(base + "/");
	});
}

/** Frontmatter-type portion of recipe detection: does this file's type property match settings.recipeType? */
export function matchesRecipeType(app: App, file: TFile, settings: RecipeBoxSettings): boolean {
	if (!settings.recipeType) return true;

	const cache = app.metadataCache.getFileCache(file);
	const fmr = (cache?.frontmatter ?? {}) as Record<string, unknown>;
	const raw = fmr[settings.recipeTypePropertyName];
	const target = settings.recipeType.trim().toLowerCase();
	return normalizeTypeValues(raw).includes(target);
}

export function isRecipeFile(app: App, file: TFile, settings: RecipeBoxSettings): boolean {
	return inRecipeFolderScope(file, settings) && matchesRecipeType(app, file, settings);
}

/** Every recipe note in the vault (or configured recipe folders), folder-scoped and type-matched in one call. */
export function getAllRecipeNotes(app: App, settings: RecipeBoxSettings): TFile[] {
	return listMarkdownFilesInRecipeFolders(app, settings).filter((file) =>
		matchesRecipeType(app, file, settings)
	);
}

export function registerAutoOpen(
	plugin: Plugin,
	settings: () => RecipeBoxSettings,
	openAsRecipe: (leaf: WorkspaceLeaf, file: TFile) => void
): void {
	plugin.registerEvent(
		plugin.app.workspace.on("file-open", (file) => {
			if (!file || !settings().autoOpenRecipeView) return;
			if (!isRecipeFile(plugin.app, file, settings())) return;

			window.setTimeout(() => {
				const markdownLeaves = plugin.app.workspace
					.getLeavesOfType("markdown")
					.filter((l) => (l.view as MarkdownView).file?.path === file.path);

				for (const leaf of markdownLeaves) {
					openAsRecipe(leaf, file);
				}
			}, 50);
		})
	);
}

export function registerContextMenu(
	plugin: Plugin,
	settings: () => RecipeBoxSettings,
	openAsRecipe: (leaf: WorkspaceLeaf, file: TFile) => void
): void {
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file, _source, leaf) => {
			if (!(file instanceof TFile)) return;
			if (leaf && leaf.view.getViewType() === RECIPE_VIEW_TYPE) return;
			if (!isRecipeFile(plugin.app, file, settings())) return;

			menu.addItem((item) => {
				item.setTitle("Recipe mode")
					.setIcon("book-open")
					.onClick(() => {
						if (leaf) openAsRecipe(leaf, file);
					});
			});
		})
	);
}
