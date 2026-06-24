import { App, MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { RECIPE_VIEW_TYPE } from "../ui/recipe-view/recipe-view";

function normalizeTypeValues(raw: unknown): string[] {
	const arr = Array.isArray(raw) ? raw : [raw];
	return arr.flatMap((v) => {
		if (typeof v !== "string") return [];
		return [v.replace(/^\[\[(.+?)(?:\|.*)?\]\]$/, "$1").trim().toLowerCase()];
	});
}

export function isRecipeFile(app: App, file: TFile, settings: RecipeBoxSettings): boolean {
	const inScope = settings.recipeFolders.length === 0 || settings.recipeFolders.some((folder) => {
		const base = folder.replace(/\/$/, "");
		return file.path === base || file.path.startsWith(base + "/");
	});
	if (!inScope) return false;

	if (!settings.recipeType) return true;

	const cache = app.metadataCache.getFileCache(file);
	const fmr = (cache?.frontmatter ?? {}) as Record<string, unknown>;
	const raw = fmr[settings.recipeTypePropertyName];
	const target = settings.recipeType.trim().toLowerCase();
	return normalizeTypeValues(raw).includes(target);
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
