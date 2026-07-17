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

// Paths recently switched to markdown *deliberately* (the pencil action, the
// "Open current file as Markdown" command) -- so the auto-open listeners
// below don't immediately convert the leaf straight back to recipe view. Both
// file-open and active-leaf-change fire for a single setViewState call, well
// within this window, so a short timeout covers both without needing a
// consume-once flag that could miss the second event.
const suppressedPaths = new Set<string>();

export function suppressAutoOpenOnce(path: string): void {
	suppressedPaths.add(path);
	window.setTimeout(() => suppressedPaths.delete(path), 500);
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
	const tryConvert = (): void => {
		if (!settings().autoOpenRecipeView) return;

		const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) return;
		if (suppressedPaths.has(view.file.path)) return;
		if (!isRecipeFile(plugin.app, view.file, settings())) return;

		openAsRecipe(view.leaf, view.file);
	};

	// file-open covers navigating to a new file within the leaf that's
	// already active. active-leaf-change covers switching focus to a
	// different leaf whose file didn't change. Both are needed; neither
	// alone covers every navigation path (e.g. a split-pane focus switch
	// onto an existing markdown leaf showing a recipe fires the latter,
	// not the former).
	plugin.registerEvent(plugin.app.workspace.on("file-open", tryConvert));
	plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", tryConvert));

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
