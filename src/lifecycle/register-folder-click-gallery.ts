/**
 * Owns dynamic attach/detach of the folder-click-opens-gallery adapters, so
 * toggling the setting takes effect immediately (no reload) while still
 * guaranteeing zero listeners registered when the feature is off. Also
 * keeps the explorer's folder underlines in sync (see folder-click-underline.ts).
 */
import RecipeBoxPlugin from "../main";
import { attachCoreExplorerFolderClickAdapter } from "../integrations/folder-click-core-explorer";
import { attachNotebookNavigatorFolderClickAdapter } from "../integrations/folder-click-notebook-navigator";
import { clearFolderClickUnderlines, refreshFolderClickUnderlines } from "../integrations/folder-click-underline";

export interface FolderClickGalleryController {
	sync: () => void;
	cleanup: () => void;
}

export function createFolderClickGalleryController(plugin: RecipeBoxPlugin): FolderClickGalleryController {
	let coreCleanup: (() => void) | null = null;
	let nnCleanup: (() => void) | null = null;

	function sync(): void {
		const enabled = plugin.settings.openGalleryOnFolderClick;

		if (enabled && !coreCleanup) {
			coreCleanup = attachCoreExplorerFolderClickAdapter(plugin);
		} else if (!enabled && coreCleanup) {
			coreCleanup();
			coreCleanup = null;
		}

		// nnCleanup staying null while enabled means this retries the
		// feature-detect on every settings save -- cheap, and means NN
		// gets picked up automatically if installed/enabled later.
		if (enabled && !nnCleanup) {
			nnCleanup = attachNotebookNavigatorFolderClickAdapter(plugin);
		} else if (!enabled && nnCleanup) {
			nnCleanup();
			nnCleanup = null;
		}

		refreshFolderClickUnderlines(plugin);
	}

	function cleanup(): void {
		coreCleanup?.();
		coreCleanup = null;
		nnCleanup?.();
		nnCleanup = null;
		clearFolderClickUnderlines();
	}

	// Re-apply underlines whenever the explorer's folder rows could have
	// changed shape -- new/renamed/deleted folders, or a layout change (e.g.
	// the explorer pane being revealed after being hidden). Always
	// registered and auto-cleaned via Component on unload: refreshFolderClickUnderlines
	// itself clears/no-ops when the feature is off, so unlike the click
	// adapters there's no "zero listener" requirement to satisfy here --
	// these are ordinary event-bus subscriptions, not a global DOM hook.
	plugin.registerEvent(plugin.app.vault.on("create", () => sync()));
	plugin.registerEvent(plugin.app.vault.on("delete", () => sync()));
	plugin.registerEvent(plugin.app.vault.on("rename", () => sync()));
	plugin.registerEvent(plugin.app.workspace.on("layout-change", () => sync()));

	return { sync, cleanup };
}
