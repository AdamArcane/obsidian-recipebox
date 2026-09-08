/**
 * Captures and restores focus/text-selection across a full DOM rebuild, keyed
 * by a `data-rb-focus-key` attribute on the focused element. The gallery
 * rebuilds its whole toolbar on every state change (including ones triggered
 * by typing, debounced) -- without this, an input loses focus the instant its
 * own debounced input event fires the re-render.
 */
export interface FocusSnapshot {
	key: string;
	selectionStart: number | null;
	selectionEnd: number | null;
}

/** Call before removing the old content. Returns null if nothing tagged was focused. */
export function captureFocus(root: Element | null): FocusSnapshot | null {
	if (!root) return null;
	const active = root.ownerDocument.activeElement;
	if (!active || !active.instanceOf(HTMLElement) || !root.contains(active)) return null;
	const key = active.getAttribute("data-rb-focus-key");
	if (!key) return null;
	if (active.instanceOf(HTMLInputElement) || active.instanceOf(HTMLTextAreaElement)) {
		return { key, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
	}
	return { key, selectionStart: null, selectionEnd: null };
}

/** Call after the new content is in the DOM. No-op if snapshot is null or the key isn't found. */
export function restoreFocus(root: Element, snapshot: FocusSnapshot | null): void {
	if (!snapshot) return;
	const match = root.querySelector(`[data-rb-focus-key="${CSS.escape(snapshot.key)}"]`);
	if (!match || !match.instanceOf(HTMLElement)) return;
	match.focus();
	if (
		(match.instanceOf(HTMLInputElement) || match.instanceOf(HTMLTextAreaElement))
		&& snapshot.selectionStart !== null
		&& snapshot.selectionEnd !== null
	) {
		match.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
	}
}
