/**
 * Makes meal plan cards draggable and day columns into drop targets, supporting
 * both internal card drags and drops from Obsidian's file explorer.
 *
 * Desktop uses HTML5 drag-and-drop. Mobile uses long-press (500ms) + touch events
 * because the `draggable` attribute suppresses touch scroll on iOS/Android without
 * providing a working drag API.
 *
 * On mobile, `makeDropTarget` registers each column's handler in `columnHandlers`
 * (a WeakMap keyed by element) so `touchend` can hit-test to find the target
 * column and invoke the right handler without changing the public signatures.
 */
import { App, Platform, TFile } from "obsidian";

export type DropPayload =
	| { kind: "entry"; id: string }
	| { kind: "recipe"; path: string };

export type DropPoint = { x: number; y: number };

type DropHandler = (payload: DropPayload, day: string | undefined, dropPoint: DropPoint) => void;

// Connects column elements to their drop handlers so the touch drag's
// hit-test in touchend can call the right handler without touching callers.
const columnHandlers = new WeakMap<HTMLElement, DropHandler>();

// ── Touch drag state ──────────────────────────────────────────────────────────

interface ActiveDrag {
	entryId: string;
	originEl: HTMLElement;
	ghostEl: HTMLElement;
}

let activeDrag: ActiveDrag | null = null;

function findDropColumn(x: number, y: number): HTMLElement | null {
	const el = activeDocument.elementFromPoint(x, y);
	if (!el) return null;
	return el.closest<HTMLElement>("[data-day]");
}

function setActiveColumn(col: HTMLElement | null): void {
	activeDocument.querySelectorAll(".rb-mpv-drop-active").forEach((el) => el.removeClass("rb-mpv-drop-active"));
	if (col) col.addClass("rb-mpv-drop-active");
}

function cleanupDrag(): void {
	if (!activeDrag) return;
	activeDrag.ghostEl.remove();
	activeDrag.originEl.removeClass("rb-mpv-card--dragging");
	setActiveColumn(null);
	activeDrag = null;
}

function onTouchMove(e: TouchEvent): void {
	if (!activeDrag) return;
	e.preventDefault(); // suppress scroll only while drag is active
	const touch = e.touches[0];
	// Offset ghost above the finger so the card is visible below the thumb
	activeDrag.ghostEl.style.left = `${touch.clientX - 10}px`;
	activeDrag.ghostEl.style.top = `${touch.clientY - 60}px`;
	setActiveColumn(findDropColumn(touch.clientX, touch.clientY));
}

function onTouchEnd(e: TouchEvent): void {
	if (!activeDrag) return;
	// Suppress the synthetic click that browsers fire after touchend when drag is confirmed
	e.preventDefault();
	const touch = e.changedTouches[0];
	const col = findDropColumn(touch.clientX, touch.clientY);
	if (col) {
		const handler = columnHandlers.get(col);
		if (handler) {
			handler(
				{ kind: "entry", id: activeDrag.entryId },
				col.dataset.day || undefined,
				{ x: touch.clientX, y: touch.clientY },
			);
		}
	}
	cleanupDrag();
	removeTouchListeners();
}

function onTouchCancel(): void {
	cleanupDrag();
	removeTouchListeners();
}

function removeTouchListeners(): void {
	activeDocument.removeEventListener("touchmove", onTouchMove);
	activeDocument.removeEventListener("touchend", onTouchEnd);
	activeDocument.removeEventListener("touchcancel", onTouchCancel);
}

// ── Desktop path helpers ──────────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export function makeDraggable(cardEl: HTMLElement, entryId: string): void {
	if (Platform.isMobile) {
		// Long-press (500ms) initiates drag; a tap (<500ms) falls through to the click handler
		let holdTimer: number | null = null;

		cardEl.addEventListener("touchstart", (e: TouchEvent) => {
			const touch = e.touches[0];
			const startX = touch.clientX;
			const startY = touch.clientY;

			holdTimer = window.setTimeout(() => {
				holdTimer = null;

				const rect = cardEl.getBoundingClientRect();
				const ghost = cardEl.cloneNode(true) as HTMLElement;
				ghost.addClass("rb-mpv-card--ghost");
				ghost.style.width = `${rect.width}px`;
				ghost.style.left = `${startX - 10}px`;
				ghost.style.top = `${startY - 60}px`;
				activeDocument.body.appendChild(ghost);

				cardEl.addClass("rb-mpv-card--dragging");

				activeDrag = { entryId, originEl: cardEl, ghostEl: ghost };

				// Attach to activeDocument so the finger can leave the card boundary
				activeDocument.addEventListener("touchmove", onTouchMove, { passive: false });
				activeDocument.addEventListener("touchend", onTouchEnd);
				activeDocument.addEventListener("touchcancel", onTouchCancel);
			}, 500);
		});

		const cancelHold = (): void => {
			if (holdTimer !== null) {
				window.clearTimeout(holdTimer);
				holdTimer = null;
			}
		};
		cardEl.addEventListener("touchend", cancelHold);
		cardEl.addEventListener("touchcancel", cancelHold);
	} else {
		// Desktop: standard HTML5 drag-and-drop
		cardEl.setAttribute("draggable", "true");
		cardEl.addEventListener("dragstart", (e: DragEvent) => {
			// Store the entry ID (not the recipe path) so the drop handler can reschedule the specific card
			e.dataTransfer?.setData("text/plain", entryId);
			if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
		});
	}
}

export function makeDropTarget(
	colEl: HTMLElement,
	day: string | undefined,
	app: App,
	onDrop: DropHandler,
): void {
	// Store day on the element so touchend can recover it via .closest('[data-day]').dataset.day
	colEl.dataset.day = day ?? "";

	if (Platform.isMobile) {
		// Register the handler so touchend can look it up by column element
		columnHandlers.set(colEl, onDrop);
		// dragover/dragleave/drop never fire on touch — all drops are handled by touchend
		return;
	}

	// Desktop: snapshot the explorer file path during dragover — dragManager may be
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
