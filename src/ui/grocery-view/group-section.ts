import { setIcon } from "obsidian";
import { GroupingMode } from "../../types";
import { DisplayGroup } from "./display-groups";
import { GroceryViewDeps } from "./grocery-view-deps";
import { renderItemRow } from "./item-row";

export function renderGroupSection(
	container: HTMLElement,
	group: DisplayGroup,
	mode: GroupingMode,
	deps: GroceryViewDeps,
	cleanups: Array<() => void>
): void {
	const checkedCount = group.items.filter((i) => i.checked).length;
	const isCollapsed = group.name ? deps.isGroupCollapsed(group.name) : false;
	const isComplete = checkedCount === group.items.length;

	const section = container.createDiv({
		cls: `rb-gv-group${isComplete ? " is-complete" : ""}${isCollapsed ? " is-collapsed" : ""}`,
	});

	if (group.name) {
		const header = section.createDiv({ cls: "rb-gv-group-header" });
		const chevron = header.createSpan({ cls: "rb-gv-chevron" });
		setIcon(chevron, isCollapsed ? "chevron-right" : "chevron-down");

		header.createSpan({ cls: "rb-gv-group-name", text: group.name });
		header.createSpan({
			cls: "rb-gv-group-badge",
			text: `${checkedCount}/${group.items.length}`,
		});

		header.addEventListener("click", () => {
			void deps.setGroupCollapsed(group.name, !isCollapsed);
		});
	}

	const itemList = section.createDiv({ cls: "rb-gv-item-list" });
	if (!isCollapsed) {
		for (const item of group.items) {
			renderItemRow(itemList, item, group.name, mode, deps, cleanups);
		}
	}
}
