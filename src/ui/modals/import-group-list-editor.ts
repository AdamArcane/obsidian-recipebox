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
 */
import { setIcon } from "obsidian";
import { ImportedGroup } from "../../importer/recipe-extract-types";

export interface GroupListEditorLabels {
	addGroup: string;
	namePlaceholder: string;
}

export function renderGroupListEditor(
	parent: HTMLElement,
	initialGroups: ImportedGroup[],
	renderEntryEditor: (body: HTMLElement, items: string[], onChange: (items: string[]) => void) => void,
	onChange: (groups: ImportedGroup[]) => void,
	labels: GroupListEditorLabels,
): void {
	const groups: ImportedGroup[] = initialGroups.length > 0
		? initialGroups.map((g) => ({ name: g.name, items: [...g.items] }))
		: [{ name: null, items: [] }];

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
					onChange(groups.map((g) => ({ name: g.name, items: g.items })));
				});

				const controls = header.createDiv({ cls: "rb-import-group-controls" });
				const upBtn = iconBtn(controls, "chevron-up", "Move group up");
				upBtn.disabled = i === 0;
				upBtn.addEventListener("click", () => {
					[groups[i - 1], groups[i]] = [groups[i], groups[i - 1]];
					renderAll();
					onChange(groups.map((g) => ({ name: g.name, items: g.items })));
				});
				const downBtn = iconBtn(controls, "chevron-down", "Move group down");
				downBtn.disabled = i === groups.length - 1;
				downBtn.addEventListener("click", () => {
					[groups[i], groups[i + 1]] = [groups[i + 1], groups[i]];
					renderAll();
					onChange(groups.map((g) => ({ name: g.name, items: g.items })));
				});
				const deleteBtn = iconBtn(controls, "trash-2", "Delete group", true);
				deleteBtn.addEventListener("click", () => {
					groups.splice(i, 1);
					if (groups.length === 0) groups.push({ name: null, items: [] });
					renderAll();
					onChange(groups.map((g) => ({ name: g.name, items: g.items })));
				});
			}

			const body = groupEl.createDiv({ cls: "rb-import-group-body" });
			renderEntryEditor(body, group.items, (items) => {
				group.items = items;
				onChange(groups.map((g) => ({ name: g.name, items: g.items })));
			});
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
			onChange(groups.map((g) => ({ name: g.name, items: g.items })));
		});
	}

	renderAll();
}
