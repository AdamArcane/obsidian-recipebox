/**
 * Drag-to-reorder for entry list rows, within a list and across lists that
 * share a scope (the groups of one Ingredients or Steps editor).
 *
 * Desktop uses HTML5 drag-and-drop from the grip handle. Mobile uses touch
 * events that start on the handle only: the handle is a dedicated target, so
 * no long-press is needed and neither click-to-edit nor list scrolling is
 * affected. Same split as meal-plan-view/drag-reschedule.ts.
 *
 * Lists register themselves in WeakMaps so the touch path can hit-test with
 * elementFromPoint and find the owning list without any DOM-to-model plumbing.
 */
import { Platform } from "obsidian";
import { finalIndexForDrop } from "./entry-order";

export interface DragList {
	/** Rows only move between lists with the same scope object. */
	scope: object;
	el: HTMLElement;
	length(): number;
	removeAt(index: number): string;
	insertAt(index: number, line: string): void;
	/** Moves the row at `from` so it ends at index `to`. */
	move(from: number, to: number): void;
}

interface DropTarget { list: DragList; insertBefore: number }

const listsByEl = new WeakMap<HTMLElement, DragList>();
const rowOwner = new WeakMap<HTMLElement, { list: DragList; index: number }>();
let active: { list: DragList; index: number; rowEl: HTMLElement } | null = null;
let lastTarget: DropTarget | null = null;

const DROP_CLASSES = ["rb-import-entry-item--drop-before", "rb-import-entry-item--drop-after", "rb-import-entry-list--drop-end"];

function clearIndicators(): void {
	for (const cls of DROP_CLASSES) {
		activeDocument.querySelectorAll(`.${cls}`).forEach((el) => el.removeClass(cls));
	}
}

function endDrag(): void {
	active?.rowEl.removeClass("rb-import-entry-item--dragging");
	active = null;
	lastTarget = null;
	clearIndicators();
}

function compatible(list: DragList): boolean {
	return !!active && active.list.scope === list.scope;
}

function targetForRow(rowEl: HTMLElement, clientY: number): DropTarget | null {
	const owner = rowOwner.get(rowEl);
	if (!owner || !compatible(owner.list)) return null;
	const rect = rowEl.getBoundingClientRect();
	const after = clientY > rect.top + rect.height / 2;
	return { list: owner.list, insertBefore: owner.index + (after ? 1 : 0) };
}

function showIndicator(target: DropTarget | null, rowEl: HTMLElement | null): void {
	clearIndicators();
	lastTarget = target;
	if (!target) return;
	if (rowEl) {
		rowEl.addClass(target.insertBefore > (rowOwner.get(rowEl)?.index ?? 0)
			? "rb-import-entry-item--drop-after"
			: "rb-import-entry-item--drop-before");
	} else {
		target.list.el.addClass("rb-import-entry-list--drop-end");
	}
}

function performDrop(target: DropTarget): void {
	if (!active) return;
	const { list: source, index: from } = active;
	if (source === target.list) {
		const to = finalIndexForDrop(from, target.insertBefore);
		if (to !== from) source.move(from, to);
	} else {
		const line = source.removeAt(from);
		target.list.insertAt(Math.min(target.insertBefore, target.list.length()), line);
	}
}

/** Makes a list element a drop target (needed for dropping into an empty group or below the last row). */
export function registerDragList(list: DragList): void {
	listsByEl.set(list.el, list);
	// Desktop only: touch hit-testing resolves the list from the point directly.
	list.el.addEventListener("dragover", (e) => {
		if (!compatible(list)) return;
		e.preventDefault();
		showIndicator({ list, insertBefore: list.length() }, null);
	});
	list.el.addEventListener("drop", (e) => {
		if (!compatible(list)) return;
		e.preventDefault();
		performDrop({ list, insertBefore: list.length() });
		endDrag();
	});
}

export function attachRowDrag(rowEl: HTMLElement, handleEl: HTMLElement, list: DragList, index: number): void {
	rowOwner.set(rowEl, { list, index });

	const begin = (): void => {
		active = { list, index, rowEl };
		rowEl.addClass("rb-import-entry-item--dragging");
	};

	if (!Platform.isMobile) {
		handleEl.draggable = true;
		handleEl.addEventListener("dragstart", (e) => {
			begin();
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = "move";
				// Firefox refuses to start a drag with no data set.
				e.dataTransfer.setData("text/plain", "");
				e.dataTransfer.setDragImage(rowEl, 12, 12);
			}
		});
		handleEl.addEventListener("dragend", endDrag);
		rowEl.addEventListener("dragover", (e) => {
			const target = targetForRow(rowEl, e.clientY);
			if (!target) return;
			e.preventDefault();
			// Keep the list-level handler from replacing this with an end-of-list indicator.
			e.stopPropagation();
			showIndicator(target, rowEl);
		});
		rowEl.addEventListener("drop", (e) => {
			const target = targetForRow(rowEl, e.clientY);
			if (!target) return;
			e.preventDefault();
			e.stopPropagation();
			performDrop(target);
			endDrag();
		});
		return;
	}

	handleEl.addEventListener("touchstart", (e) => {
		e.stopPropagation();
		begin();
	}, { passive: true });
	handleEl.addEventListener("touchmove", (e) => {
		if (!active) return;
		// Only while a handle drag is live; ordinary scrolling never reaches here.
		e.preventDefault();
		const t = e.touches[0];
		const under = activeDocument.elementFromPoint(t.clientX, t.clientY);
		const overRow = under?.closest<HTMLElement>(".rb-import-entry-item") ?? null;
		if (overRow) { showIndicator(targetForRow(overRow, t.clientY), overRow); return; }
		const overList = under?.closest<HTMLElement>(".rb-import-entry-list");
		const list = overList ? listsByEl.get(overList) : undefined;
		showIndicator(list && compatible(list) ? { list, insertBefore: list.length() } : null, null);
	}, { passive: false });
	handleEl.addEventListener("touchend", (e) => {
		// Swallow the synthetic click so the row isn't loaded for editing.
		e.preventDefault();
		if (lastTarget) performDrop(lastTarget);
		endDrag();
	});
	handleEl.addEventListener("touchcancel", endDrag);
}
