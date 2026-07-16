/**
 * Reuses an existing leaf of the given view type (optionally showing a specific
 * file) or opens a new tab — used by all three plugin views.
 */
import { App, TFile, WorkspaceLeaf } from "obsidian";

/**
 * Finds an existing leaf of `viewType` (optionally showing `filePath`) and
 * reveals it, or opens one and sets it to that view/file.
 *
 * - Singleton views (grocery, meal plan): omit `filePath`.
 * - File-backed views (recipe, markdown): pass `filePath` to reuse a leaf
 *   already showing that specific file rather than opening a duplicate.
 * - `newLeafMode` controls where a *new* leaf goes when none already exists
 *   (irrelevant when an existing leaf is reused/revealed). Defaults to
 *   `"tab"`, matching the ribbon-icon/command-palette convention used by
 *   every view. Pass `false` for callers that should behave like clicking a
 *   file in the explorer -- replace the current leaf instead of opening a
 *   new one (e.g. the folder-click-opens-gallery integration).
 */
export async function findOrOpenLeaf(
	app: App,
	viewType: string,
	filePath?: string,
	newLeafMode: boolean | "tab" = "tab",
): Promise<WorkspaceLeaf> {
	const existing = filePath
		? app.workspace.getLeavesOfType(viewType)
			.find((l) => (l.view as { file?: TFile }).file?.path === filePath)
		: app.workspace.getLeavesOfType(viewType)[0];

	if (existing) {
		void app.workspace.revealLeaf(existing);
		return existing;
	}

	const leaf = app.workspace.getLeaf(newLeafMode);
	await leaf.setViewState({
		type: viewType,
		...(filePath ? { state: { file: filePath } } : {}),
		active: true,
	});
	void app.workspace.revealLeaf(leaf);
	return leaf;
}
