import { App, TFile } from "obsidian";

export function makeDraggable(cardEl: HTMLElement, entryId: string): void {
	cardEl.setAttribute("draggable", "true");
	cardEl.addEventListener("dragstart", (e: DragEvent) => {
		// Store the entry ID (not the recipe path) so the drop handler can reschedule the specific card
		e.dataTransfer?.setData("text/plain", entryId);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
	});
}

// Resolve whatever path/URI string we received into a vault-relative .md path.
// Obsidian's file explorer sets text/plain to an Obsidian URI like:
//   obsidian://open?vault=VaultName&file=Recipes%2FMy%20Recipe
// or the partial form:
//   open?vault=VaultName&file=Recipes%2FMy%20Recipe
function resolveVaultPath(raw: string): string | null {
	const s = raw.trim();
	if (!s) return null;

	// Already a vault-relative .md path (set by our own makeDraggable)
	if (s.endsWith(".md") && !s.includes("?")) return s;

	// Obsidian URI — full or partial
	let query = "";
	if (s.startsWith("obsidian://open?")) {
		query = s.slice("obsidian://open?".length);
	} else if (s.startsWith("open?vault=") || s.startsWith("open?file=")) {
		query = s.slice("open?".length);
	}

	if (query) {
		try {
			const params = new URLSearchParams(query);
			const file = params.get("file");
			if (file) {
				const decoded = decodeURIComponent(file);
				return decoded.endsWith(".md") ? decoded : decoded + ".md";
			}
		} catch { /* malformed query */ }
	}

	return null;
}

function explorerFilePath(app: App, e?: DragEvent): string | null {
	// Try all dataTransfer types, resolving each value
	if (e?.dataTransfer) {
		for (const type of Array.from(e.dataTransfer.types)) {
			try {
				const val = e.dataTransfer.getData(type);
				const resolved = val ? resolveVaultPath(val) : null;
				if (resolved) return resolved;
			} catch { /* some types can't be read outside dragstart */ }
		}
	}

	// Fall back to Obsidian's drag manager (try common property shapes)
	const dm = (app as unknown as { dragManager?: { draggable?: Record<string, unknown> } }).dragManager;
	const d = dm?.draggable;
	if (d) {
		for (const key of ["file", "source"]) {
			const f = d[key];
			if (f instanceof TFile && f.extension === "md") return f.path;
		}
	}

	return null;
}

export type DropPayload =
	| { kind: "entry"; id: string }
	| { kind: "recipe"; path: string };

export type DropPoint = { x: number; y: number };

export function makeDropTarget(
	colEl: HTMLElement,
	day: string | undefined,
	app: App,
	onDrop: (payload: DropPayload, day: string | undefined, dropPoint: DropPoint) => void
): void {
	// Snapshot the explorer file path during dragover — dragManager may be
	// cleared before the drop event fires.
	let pendingExplorerPath: string | null = null;

	colEl.addEventListener("dragover", (e: DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
		colEl.addClass("rb-mpv-drop-active");
		const fp = explorerFilePath(app, e);
		if (fp) pendingExplorerPath = fp;
	});

	colEl.addEventListener("dragleave", (e: DragEvent) => {
		if (!colEl.contains(e.relatedTarget as Node | null)) {
			colEl.removeClass("rb-mpv-drop-active");
			pendingExplorerPath = null;
		}
	});

	colEl.addEventListener("drop", (e: DragEvent) => {
		e.preventDefault();
		colEl.removeClass("rb-mpv-drop-active");
		const rawPlain = e.dataTransfer?.getData("text/plain") ?? "";
		const dropPoint: DropPoint = { x: e.clientX, y: e.clientY };

		// Try to resolve as a vault path (file explorer drops or Obsidian URIs)
		const recipePath =
			resolveVaultPath(rawPlain) ||
			explorerFilePath(app, e) ||
			(pendingExplorerPath ? resolveVaultPath(pendingExplorerPath) : null);
		pendingExplorerPath = null;

		if (recipePath) {
			onDrop({ kind: "recipe", path: recipePath }, day, dropPoint);
		} else if (rawPlain) {
			// rawPlain is an entry ID from our own card drag (not a file path)
			onDrop({ kind: "entry", id: rawPlain }, day, dropPoint);
		}
	});
}
