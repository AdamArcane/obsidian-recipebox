/**
 * Adapter for Notebook Navigator: uses its documented public API rather
 * than reaching into its React DOM tree, since NN doesn't share the core
 * explorer's markup. Inert (returns null, registers nothing) if NN isn't
 * installed or its version predates the event this adapter needs.
 */
import RecipeBoxPlugin from "../main";
import { isFolderClickGalleryTarget } from "./folder-click-match";
import { getNotebookNavigatorApi, NotebookNavigatorEventRef } from "./notebook-navigator-api";

// nav-item-changed is assumed available from 2.0.0 onward (NN's 2.x line is
// additive-only per their stability policy). An unparsable version string is
// treated as supported -- lenient rather than silently disabling on a
// version format we don't recognize.
function supportsNavItemChanged(version: string): boolean {
	const major = parseInt(version, 10);
	return Number.isNaN(major) || major >= 2;
}

export function attachNotebookNavigatorFolderClickAdapter(plugin: RecipeBoxPlugin): (() => void) | null {
	const nn = getNotebookNavigatorApi(plugin.app);
	if (!nn) return null;
	if (nn.getVersion && !supportsNavItemChanged(nn.getVersion())) return null;

	let cancelled = false;
	let ref: NotebookNavigatorEventRef | null = null;

	void nn.whenReady().then(() => {
		if (cancelled) return;
		ref = nn.on("nav-item-changed", ({ item }) => {
			if (item.type !== "folder" || !item.folder) return;
			if (!isFolderClickGalleryTarget(item.folder.path, plugin.settings)) return;
			// Matches the core-explorer adapter: reuse the current leaf rather
			// than opening a new tab (NN handles its own selection highlight,
			// so there's no active-state replication needed here).
			void plugin.activateGalleryView(item.folder.path, { newLeaf: false });
		});
	});

	return () => {
		cancelled = true;
		if (ref) nn.off(ref);
	};
}
