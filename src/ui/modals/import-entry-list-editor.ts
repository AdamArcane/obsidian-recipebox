/**
 * Generic "type into fields, press Add or Enter, get an editable list" input
 * used by the add-recipe review stage for both ingredients and steps. Field
 * count and the line format are supplied by the caller (see
 * import-ingredient-editor.ts / import-step-editor.ts); this module only
 * owns the row of inputs, the add/update/cancel button states, and the list
 * itself. Clicking a list row loads it back into the fields for editing
 * in place (replaced at the same index on commit) rather than removing and
 * re-appending it, so editing never reorders the list.
 *
 * Rows can be reordered by dragging the grip handle or with Alt+Up/Down. The
 * returned handle lets a group editor move rows between lists.
 */
import { setIcon } from "obsidian";
import { attachRowDrag, DragList, registerDragList } from "./entry-row-drag";
import { editIndexAfterInsert, editIndexAfterMove, editIndexAfterRemove, reorder } from "./entry-order";

export interface EntryField {
	key: string;
	label: string;
	placeholder: string;
	cls: string;
}

export interface EntryListOptions {
	/** Lists sharing a scope object accept each other's dragged rows. Defaults to this list alone. */
	scope?: object;
	/**
	 * Alt+Up on the first row / Alt+Down on the last row. Return true if the
	 * row was moved into a neighbouring list (the caller then owns focus).
	 */
	onEdgeMove?: (direction: -1 | 1, index: number) => boolean;
}

export interface EntryListHandle {
	list: DragList;
	focusRow(index: number): void;
}

export function renderEntryListEditor(
	parent: HTMLElement,
	fields: EntryField[],
	initialItems: string[],
	decompose: (line: string) => Record<string, string>,
	compose: (values: Record<string, string>) => string,
	renderSummary: (values: Record<string, string>, textEl: HTMLElement) => void,
	onChange: (items: string[]) => void,
	options: EntryListOptions = {},
): EntryListHandle {
	let items: string[] = [...initialItems];
	let editIndex: number | null = null;
	// Row to refocus after the next render; keyboard moves rebuild the DOM, so
	// without this focus would drop to the body and break repeated Alt+Arrow.
	let focusAfterRender: number | null = null;

	const listEl = parent.createDiv({ cls: "rb-import-entry-list" });
	const row = parent.createDiv({ cls: "rb-import-entry-row" });

	const inputs: Record<string, HTMLInputElement> = {};
	for (const f of fields) {
		const cell = row.createDiv({ cls: `rb-import-entry-cell ${f.cls}` });
		cell.createSpan({ cls: "rb-import-entry-cell-label", text: f.label });
		inputs[f.key] = cell.createEl("input", {
			cls: "rb-import-text-input",
			attr: { type: "text", placeholder: f.placeholder },
		});
	}

	const addBtn = row.createEl("button", { cls: "rb-modal-btn", attr: { type: "button" } });
	const addBtnIcon = addBtn.createSpan({ cls: "rb-modal-btn-icon" });
	setIcon(addBtnIcon, "plus");
	const addBtnLabel = addBtn.createSpan({ text: "Add" });

	const cancelBtn = row.createEl("button", {
		cls: "rb-import-entry-cancel-btn",
		attr: { type: "button" },
		text: "Cancel",
	});
	cancelBtn.hide();

	function currentValues(): Record<string, string> {
		const v: Record<string, string> = {};
		for (const f of fields) v[f.key] = inputs[f.key].value;
		return v;
	}

	function setEditingUI(editing: boolean): void {
		setIcon(addBtnIcon, editing ? "check" : "plus");
		addBtnLabel.setText(editing ? "Update" : "Add");
		cancelBtn.toggle(editing);
	}

	function clearFields(): void {
		for (const f of fields) inputs[f.key].value = "";
		editIndex = null;
		setEditingUI(false);
	}

	// Every structural change goes through these three so the edit-index
	// bookkeeping lives in one place. Removing a row ABOVE the one being
	// edited used to leave editIndex pointing one row too far, so Update
	// would overwrite the wrong entry.
	function removeAt(index: number): string {
		const [removed] = items.splice(index, 1);
		const next = editIndexAfterRemove(editIndex, index);
		if (editIndex !== null && next === null) clearFields();
		else editIndex = next;
		renderList();
		onChange(items);
		return removed;
	}

	function insertAt(index: number, line: string): void {
		items.splice(index, 0, line);
		editIndex = editIndexAfterInsert(editIndex, index);
		renderList();
		onChange(items);
	}

	function move(from: number, to: number): void {
		if (from === to || to < 0 || to >= items.length) return;
		items = reorder(items, from, to);
		// The row loaded into the fields moves with the list; otherwise Update
		// would overwrite whatever row now sits at the old position.
		editIndex = editIndexAfterMove(editIndex, from, to);
		renderList();
		onChange(items);
	}

	const dragList: DragList = {
		scope: options.scope ?? {},
		el: listEl,
		length: () => items.length,
		removeAt,
		insertAt,
		move,
	};
	registerDragList(dragList);

	function focusRow(index: number): void {
		const el = listEl.children[index];
		if (el.instanceOf(HTMLElement)) el.focus();
	}

	function onRowKeydown(e: KeyboardEvent, i: number): void {
		if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
		// Only act when the row itself is focused, not the remove button or a field.
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		const dir = e.key === "ArrowUp" ? -1 : 1;
		const to = i + dir;
		if (to >= 0 && to < items.length) {
			focusAfterRender = to;
			move(i, to);
		} else {
			options.onEdgeMove?.(dir, i);
		}
	}

	function renderList(): void {
		listEl.empty();
		items.forEach((line, i) => {
			const v = decompose(line);
			const itemEl = listEl.createDiv({ cls: "rb-import-entry-item", attr: { tabindex: "0" } });
			itemEl.toggleClass("rb-import-entry-item--editing", i === editIndex);
			const handle = itemEl.createSpan({
				cls: "rb-import-entry-item-handle",
				attr: { "aria-label": "Drag to reorder" },
			});
			setIcon(handle, "grip-vertical");
			// A tap on the handle is a drag gesture, never "load this row".
			handle.addEventListener("click", (e) => e.stopPropagation());
			attachRowDrag(itemEl, handle, dragList, i);
			itemEl.createSpan({ cls: "rb-import-entry-item-index", text: `${i + 1}.` });
			const textEl = itemEl.createSpan({ cls: "rb-import-entry-item-text" });
			renderSummary(v, textEl);
			itemEl.addEventListener("keydown", (e) => onRowKeydown(e, i));
			itemEl.addEventListener("click", () => {
				for (const f of fields) inputs[f.key].value = v[f.key] ?? "";
				editIndex = i;
				setEditingUI(true);
				renderList();
				inputs[fields[0].key].focus();
			});
			const removeBtn = itemEl.createEl("button", {
				cls: "rb-import-entry-item-remove",
				attr: { type: "button", "aria-label": "Remove" },
			});
			setIcon(removeBtn, "x");
			removeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				removeAt(i);
			});
		});
		if (focusAfterRender !== null) {
			const target = focusAfterRender;
			focusAfterRender = null;
			focusRow(target);
		}
	}

	function commit(): void {
		const line = compose(currentValues());
		if (!line) return;
		if (editIndex !== null) items[editIndex] = line;
		else items.push(line);
		clearFields();
		renderList();
		onChange(items);
		inputs[fields[0].key].focus();
	}

	addBtn.addEventListener("click", commit);
	cancelBtn.addEventListener("click", () => { clearFields(); renderList(); });
	for (const f of fields) {
		inputs[f.key].addEventListener("keydown", (e) => {
			if (e.key === "Enter") { e.preventDefault(); commit(); }
		});
	}

	renderList();
	return { list: dragList, focusRow };
}
