/**
 * Renders a single grocery item row with a checkbox, name, quantity, source
 * attribution, and a long-press / right-click context menu for manually-added items.
 */
import { setIcon } from "obsidian";
import { GroceryItem, GroceryItemEntry, GroupingMode } from "../../types";
import { toTitleCase } from "../../utils/text-case";
import { GroceryViewDeps } from "./grocery-view-deps";
import { attachLongPress } from "./long-press";
import { openGroceryItemContextMenu } from "./grocery-item-context-menu";

function findMatchingEntry(item: GroceryItem, entries: GroceryItemEntry[]): GroceryItemEntry | undefined {
	const nameLower = item.name.toLowerCase();
	const unitLower = item.unit.toLowerCase();
	return entries.find(
		(o) => o.name.toLowerCase() === nameLower && o.unit.toLowerCase() === unitLower
	);
}

function buildSourcesText(item: GroceryItem, groupName: string, mode: GroupingMode): string {
	const filtered = item.sources.filter((src) => {
		if (src.label === groupName) return false;
		if (mode === "source" && src.kind === "manual" && src.label === "Manually Added") return false;
		return true;
	});
	return filtered.map((s) => s.label).join(", ");
}

export function renderItemRow(
	container: HTMLElement,
	item: GroceryItem,
	groupName: string,
	mode: GroupingMode,
	deps: GroceryViewDeps,
	cleanups: Array<() => void>
): void {
	const row = container.createDiv({ cls: `rb-gv-item-row${item.checked ? " is-checked" : ""}` });

	const checkbox = row.createEl("input", { type: "checkbox" });
	checkbox.checked = item.checked;
	checkbox.addEventListener("change", () => {
		void deps.toggleChecked(item.key, checkbox.checked);
	});

	const body = row.createDiv({ cls: "rb-gv-item-body" });
	const nameLine = body.createDiv({ cls: "rb-gv-item-name-line" });

	const name = nameLine.createSpan({ cls: "rb-gv-item-name", text: toTitleCase(item.name) });
	void name;

	if (item.quantity !== null || item.unit) {
		const qtyParts: string[] = [];
		if (item.quantity !== null) qtyParts.push(String(item.quantity));
		if (item.unit) qtyParts.push(item.unit);
		nameLine.createSpan({ cls: "rb-gv-item-qty", text: `(${qtyParts.join(" ")})` });
	}

	const sourcesText = buildSourcesText(item, groupName, mode);
	if (sourcesText) {
		const sourcesEl = body.createDiv({ cls: "rb-gv-item-sources" });
		const parts = item.sources.filter((src) => {
			if (src.label === groupName) return false;
			if (mode === "source" && src.kind === "manual" && src.label === "Manually Added") return false;
			return true;
		});
		for (let i = 0; i < parts.length; i++) {
			const src = parts[i];
			if (src.kind === "recipe" && src.path) {
				const link = sourcesEl.createEl("a", { cls: "rb-gv-source-link", text: src.label });
				link.addEventListener("click", (e) => {
					deps.openFile(src.path!, e.metaKey || e.ctrlKey);
				});
			} else {
				sourcesEl.createSpan({ text: src.label });
			}
			if (i < parts.length - 1) sourcesEl.appendText(", ");
		}
	}

	const entry = findMatchingEntry(item, deps.getGroceryItemEntries());
	if (entry) {
		const removeBtn = row.createDiv({ cls: "rb-gv-item-remove" });
		setIcon(removeBtn, "x");
		removeBtn.setAttribute("aria-label", "Remove item");
		removeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			void deps.removeGroceryItem(entry.id);
		});

		const detach = attachLongPress(row, (pos) => {
			openGroceryItemContextMenu(pos, entry, deps);
		});
		cleanups.push(detach);
	}
}
