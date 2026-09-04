/**
 * Generic "type into fields, press Add or Enter, get an editable list" input
 * used by the add-recipe review stage for both ingredients and steps. Field
 * count and the line format are supplied by the caller (see
 * import-ingredient-editor.ts / import-step-editor.ts); this module only
 * owns the row of inputs, the add/update/cancel button states, and the list
 * itself. Clicking a list row loads it back into the fields for editing
 * in place (replaced at the same index on commit) rather than removing and
 * re-appending it, so editing never reorders the list.
 */
import { setIcon } from "obsidian";

export interface EntryField {
	key: string;
	label: string;
	placeholder: string;
	cls: string;
}

export function renderEntryListEditor(
	parent: HTMLElement,
	fields: EntryField[],
	initialItems: string[],
	decompose: (line: string) => Record<string, string>,
	compose: (values: Record<string, string>) => string,
	renderSummary: (values: Record<string, string>, textEl: HTMLElement) => void,
	onChange: (items: string[]) => void,
): void {
	const items: string[] = [...initialItems];
	let editIndex: number | null = null;

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

	function renderList(): void {
		listEl.empty();
		items.forEach((line, i) => {
			const v = decompose(line);
			const itemEl = listEl.createDiv({ cls: "rb-import-entry-item" });
			itemEl.toggleClass("rb-import-entry-item--editing", i === editIndex);
			itemEl.createSpan({ cls: "rb-import-entry-item-index", text: `${i + 1}.` });
			const textEl = itemEl.createSpan({ cls: "rb-import-entry-item-text" });
			renderSummary(v, textEl);
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
				items.splice(i, 1);
				// Editing the item that just got removed would otherwise leave
				// editIndex pointing at whatever now sits at that position.
				if (editIndex === i) clearFields();
				renderList();
				onChange(items);
			});
		});
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
}
