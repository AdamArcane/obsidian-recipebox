/**
 * Wraps a per-group entry editor (renderIngredientListEditor /
 * renderStepListEditor) to manage a full ImportedGroup[] instead of a flat
 * item list, adding group add/rename/reorder/delete on top.
 *
 * A single unnamed group (the common case) renders with no header chrome at
 * all -- just the flat entry editor plus an "Add group" button below it.
 * Chrome (name input, reorder, delete) appears once there's more than one
 * group, or the lone group already has a name (so a name never silently
 * disappears just because a sibling group was deleted).
 *
 * renderAll() -- which tears down and rebuilds every group's DOM -- only
 * runs on structural changes (add/remove/reorder group). Item-level edits
 * and group renames mutate the local `groups` array and call onChange
 * directly without touching the DOM, since each group's body is a live
 * entry-list-editor instance with its own in-progress add/edit state that a
 * full re-render would otherwise wipe out on every keystroke.
 *
 * Rows can also move between groups (drag onto another group's list, or
 * Alt+Up on a group's first row / Alt+Down on its last). That lives here,
 * not in the entry editor, because each group's entry editor is independent
 * and only this module can see its neighbours.
 */
import { App, setIcon } from "obsidian";
import { ImportedGroup } from "../../importer/recipe-extract-types";
import { ConfirmModal } from "./confirm-modal";
import { EntryListHandle, EntryListOptions } from "./import-entry-list-editor";

export interface GroupListEditorLabels {
	addGroup: string;
	namePlaceholder: string;
}

export function renderGroupListEditor(
	app: App,
	parent: HTMLElement,
	initialGroups: ImportedGroup[],
	renderEntryEditor: (
		body: HTMLElement,
		items: string[],
		onChange: (items: string[]) => void,
		options: EntryListOptions,
	) => EntryListHandle,
	onChange: (groups: ImportedGroup[]) => void,
	labels: GroupListEditorLabels,
): void {
	// headingLevel rides along (only set when editing an existing note) so a
	// rewritten section keeps each sub-heading's original depth.
	const groups: ImportedGroup[] = initialGroups.length > 0
		? initialGroups.map((g) => ({ name: g.name, items: [...g.items], headingLevel: g.headingLevel }))
		: [{ name: null, items: [] }];

	// One scope for the whole editor: rows may move between its groups but
	// never into another section's editor on the same form.
	const scope = {};
	let handles: EntryListHandle[] = [];

	function snapshot(): ImportedGroup[] {
		return groups.map((g) => ({ name: g.name, items: g.items, headingLevel: g.headingLevel }));
	}

	// Alt+Up on a group's first row / Alt+Down on its last row hands the row
	// to the neighbouring group: end of the previous, start of the next.
	function moveAcrossGroups(from: number, direction: -1 | 1, index: number): boolean {
		const dest = from + direction;
		if (dest < 0 || dest >= handles.length) return false;
		const line = handles[from].list.removeAt(index);
		const at = direction < 0 ? handles[dest].list.length() : 0;
		handles[dest].list.insertAt(at, line);
		handles[dest].focusRow(at);
		return true;
	}

	const groupsEl = parent.createDiv({ cls: "rb-import-groups" });

	function isChromeVisible(): boolean {
		return groups.length > 1 || groups[0].name !== null;
	}

	function iconBtn(container: HTMLElement, icon: string, label: string, danger = false): HTMLButtonElement {
		const btn = container.createEl("button", {
			cls: danger ? "rb-import-group-icon-btn rb-import-group-icon-btn--danger" : "rb-import-group-icon-btn",
			attr: { type: "button", "aria-label": label },
		});
		setIcon(btn, icon);
		return btn;
	}

	function renderAll(): void {
		groupsEl.empty();
		handles = [];
		const chromeVisible = isChromeVisible();

		groups.forEach((group, i) => {
			// No border/padding when chrome is hidden -- a lone unnamed group
			// should look exactly like a plain flat list, not a boxed section
			// nested inside another box.
			const groupEl = groupsEl.createDiv({ cls: chromeVisible ? "rb-import-group" : undefined });

			if (chromeVisible) {
				const header = groupEl.createDiv({ cls: "rb-import-group-header" });
				const nameInput = header.createEl("input", {
					cls: "rb-import-text-input rb-import-group-name-input",
					attr: { type: "text", placeholder: labels.namePlaceholder },
				});
				nameInput.value = group.name ?? "";
				nameInput.addEventListener("input", () => {
					group.name = nameInput.value.trim() || null;
					onChange(snapshot());
				});

				const controls = header.createDiv({ cls: "rb-import-group-controls" });
				const upBtn = iconBtn(controls, "chevron-up", "Move group up");
				upBtn.disabled = i === 0;
				upBtn.addEventListener("click", () => {
					[groups[i - 1], groups[i]] = [groups[i], groups[i - 1]];
					renderAll();
					onChange(snapshot());
				});
				const downBtn = iconBtn(controls, "chevron-down", "Move group down");
				downBtn.disabled = i === groups.length - 1;
				downBtn.addEventListener("click", () => {
					[groups[i], groups[i + 1]] = [groups[i + 1], groups[i]];
					renderAll();
					onChange(snapshot());
				});
				// Delete drops the items with the group; Ungroup keeps them. Removing
				// a heading in Markdown folds its items into the list above, so a
				// later group's items join the previous group. The first group has
				// nothing above it and simply loses its name, becoming the unnamed
				// lead list.
				const ungroupBtn = iconBtn(controls, "ungroup", "Ungroup (keep items)");
				ungroupBtn.addEventListener("click", () => {
					if (i === 0) {
						group.name = null;
						group.headingLevel = undefined;
					} else {
						groups[i - 1].items = [...groups[i - 1].items, ...group.items];
						groups.splice(i, 1);
					}
					renderAll();
					onChange(snapshot());
				});
				const deleteBtn = iconBtn(controls, "trash-2", "Delete group", true);
				const doDelete = (): void => {
					groups.splice(i, 1);
					if (groups.length === 0) groups.push({ name: null, items: [] });
					renderAll();
					onChange(snapshot());
				};
				deleteBtn.addEventListener("click", () => {
					// Deleting used to be silent, which is too easy to do by accident
					// once the group holds a real recipe's worth of rows.
					if (group.items.length === 0) { doDelete(); return; }
					new ConfirmModal(
						app,
						"Delete group?",
						`Delete group and its ${group.items.length} item${group.items.length === 1 ? "" : "s"}?`,
						"Delete",
						{ destructive: true, onConfirm: doDelete },
					).open();
				});
			}

			const body = groupEl.createDiv({ cls: "rb-import-group-body" });
			handles.push(renderEntryEditor(body, group.items, (items) => {
				group.items = items;
				onChange(snapshot());
			}, {
				scope,
				onEdgeMove: (direction, index) => moveAcrossGroups(i, direction, index),
			}));
		});

		const addGroupBtn = groupsEl.createEl("button", { cls: "rb-modal-btn rb-import-add-group-btn", attr: { type: "button" } });
		setIcon(addGroupBtn.createSpan({ cls: "rb-modal-btn-icon" }), "plus");
		addGroupBtn.createSpan({ text: labels.addGroup });
		addGroupBtn.addEventListener("click", () => {
			// The first split -- one flat, unnamed group becoming two -- reads as
			// a glitch if both show up as identical blank boxes. Defaulting names
			// here only, not on later adds, makes that first split legible without
			// stomping on a name the user has since cleared on purpose.
			if (groups.length === 1 && groups[0].name === null) {
				groups[0].name = "Group 1";
				groups.push({ name: "Group 2", items: [] });
			} else {
				groups.push({ name: null, items: [] });
			}
			renderAll();
			onChange(snapshot());
		});
	}

	renderAll();
}
