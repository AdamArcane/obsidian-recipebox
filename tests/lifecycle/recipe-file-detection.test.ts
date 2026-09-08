import { describe, it, expect, vi } from "vitest";

// recipe-file-detection.ts imports RECIPE_VIEW_TYPE from recipe-view.ts purely
// for a string constant, but that module's own import graph (modals, layouts)
// pulls in a long tail of obsidian exports this test has no reason to touch.
// Mocking it out keeps the "obsidian" mock below limited to what's actually used.
vi.mock("../../src/ui/recipe-view/recipe-view", () => ({ RECIPE_VIEW_TYPE: "recipe-box-recipe-view" }));

vi.mock("obsidian", () => ({
	MarkdownView: class {},
}));

import { MarkdownView } from "obsidian";
import { registerAutoOpen, suppressAutoOpenOnce } from "../../src/lifecycle/recipe-file-detection";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { TFile } from "obsidian";

// setTimeout/clearTimeout live on globalThis already; suppressAutoOpenOnce
// just calls them via `window`, mirroring the existing debounce test's fix
// for the same node-environment gap (tests run without a real DOM global).
vi.stubGlobal("window", globalThis);

function makeFile(path: string): TFile {
	return { path, extension: "md" } as TFile;
}

// Minimal stand-in for a MarkdownView showing `file` -- just enough that the
// `instanceof MarkdownView` check in registerAutoOpen's tryConvert passes.
function makeView(file: TFile): { file: TFile; leaf: object } {
	return Object.assign(Object.create(MarkdownView.prototype), { file, leaf: {} });
}

function makePlugin(view: unknown) {
	const handlers: Record<string, () => void> = {};
	const plugin = {
		app: {
			workspace: {
				getActiveViewOfType: () => view,
				on: (name: string, cb: () => void) => {
					handlers[name] = cb;
					return {};
				},
			},
			metadataCache: { getFileCache: () => null },
		},
		registerEvent: () => undefined,
	};
	return { plugin, handlers };
}

describe("registerAutoOpen", () => {
	it("converts a matching markdown file to the recipe view", () => {
		const file = makeFile("Recipes/Soup.md");
		const view = makeView(file);
		const { plugin, handlers } = makePlugin(view);
		const settings = { ...DEFAULT_SETTINGS, recipeFolders: [], recipeType: "" };
		const openAsRecipe = vi.fn();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		registerAutoOpen(plugin as any, () => settings, openAsRecipe);
		handlers["file-open"]();

		expect(openAsRecipe).toHaveBeenCalledWith(view.leaf, file);
	});

	// Regression test for the "back navigation never leaves the recipe view"
	// bug: leaving the recipe view (RecipeView.onClose) calls
	// suppressAutoOpenOnce for the file it was showing, so the Markdown state
	// that a workspace navigation-history back/forward step briefly lands on
	// isn't immediately flipped back to the recipe view underneath the user.
	it("does not re-convert a file that was just suppressed via suppressAutoOpenOnce", () => {
		const file = makeFile("Recipes/Soup.md");
		const view = makeView(file);
		const { plugin, handlers } = makePlugin(view);
		const settings = { ...DEFAULT_SETTINGS, recipeFolders: [], recipeType: "" };
		const openAsRecipe = vi.fn();

		suppressAutoOpenOnce(file.path);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		registerAutoOpen(plugin as any, () => settings, openAsRecipe);
		handlers["file-open"]();

		expect(openAsRecipe).not.toHaveBeenCalled();
	});
});
