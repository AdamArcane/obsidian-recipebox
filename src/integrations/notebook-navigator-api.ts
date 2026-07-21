/**
 * Minimal type slice for Notebook Navigator's public API (version 2.0.0),
 * hand-copied from their documented API reference rather than imported as
 * a dependency, since NN may not be installed. Only the shapes this
 * plugin's folder-click adapter actually uses are included here -- not a
 * full mirror of notebook-navigator.d.ts. If NN's API adds fields we don't
 * use, this slice doesn't need to track them (2.x is additive-only per
 * their stability policy, so this narrow slice stays valid across updates).
 */
import { App, TFolder } from "obsidian";

export interface NotebookNavigatorNavItem {
	type: "folder" | "tag" | "property" | undefined;
	folder?: TFolder;
	// tag / property fields exist on NN's real NavItem but are irrelevant
	// to a folder-click adapter, intentionally omitted.
}

// Opaque handle from NN's API, only ever passed back into nn.off(); not
// meant to have shape of its own.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- opaque handle, intentionally has no members of its own
export interface NotebookNavigatorEventRef {
}

export interface NotebookNavigatorAPI {
	getVersion?(): string;
	whenReady(): Promise<void>;
	on(
		event: "nav-item-changed",
		callback: (data: { item: NotebookNavigatorNavItem }) => void,
	): NotebookNavigatorEventRef;
	off(ref: NotebookNavigatorEventRef): void;
}

interface CommunityPluginRegistry {
	plugins?: {
		plugins?: Record<string, { api?: unknown } | undefined>;
	};
}

// The one unavoidable reach into Obsidian's community plugin registry, which
// the public App type doesn't expose. Isolated here so a future Obsidian
// typing change is a one-line fix, not a scattered one.
export function getNotebookNavigatorApi(app: App): NotebookNavigatorAPI | null {
	const registry = app as unknown as CommunityPluginRegistry;
	const api = registry.plugins?.plugins?.["notebook-navigator"]?.api;
	return (api as NotebookNavigatorAPI | undefined) ?? null;
}
