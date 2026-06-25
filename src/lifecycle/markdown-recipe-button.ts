/**
 * Injects an "Open as recipe" action button into the Markdown view toolbar
 * whenever the active file qualifies as a recipe, and removes it otherwise.
 */
import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { isRecipeFile } from "./recipe-file-detection";

const BUTTON_ATTR = "data-recipe-box-btn";

function removeInjectedButton(leaf: WorkspaceLeaf): void {
	leaf.view.containerEl
		.querySelectorAll(`[${BUTTON_ATTR}]`)
		.forEach((el) => el.remove());
}

function injectButton(
	view: MarkdownView,
	onClick: () => void
): void {
	const btn = view.addAction("chef-hat", "Open as recipe", onClick);
	btn.setAttribute(BUTTON_ATTR, "");

	// Move button before the last existing action icon so it doesn't trail pinned icons
	const bar = btn.parentElement;
	if (bar && bar.lastElementChild && bar.lastElementChild !== btn) {
		bar.insertBefore(btn, bar.lastElementChild);
	}
}

export function registerMarkdownRecipeButton(
	plugin: Plugin,
	settings: () => RecipeBoxSettings,
	openAsRecipe: (leaf: WorkspaceLeaf, file: TFile) => void
): void {
	function update(): void {
		const leaf = plugin.app.workspace.getMostRecentLeaf();
		if (!leaf) return;

		removeInjectedButton(leaf);

		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return;

		const file = view.file;
		if (!file || !isRecipeFile(plugin.app, file, settings())) return;

		injectButton(view, () => openAsRecipe(leaf, file));
	}

	plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", update));
	plugin.registerEvent(plugin.app.workspace.on("file-open", update));
}
