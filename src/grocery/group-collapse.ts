/**
 * Manages collapsed/expanded state for grocery-view groups and auto-collapses
 * a group when all its items are checked (if the setting is enabled).
 */
import { GroceryItem, GroupingMode } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";

export function isGroupCollapsed(settings: RecipeBoxSettings, name: string): boolean {
	return settings.state.collapsedSections[name] ?? false;
}

export async function setGroupCollapsed(
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	name: string,
	collapsed: boolean
): Promise<void> {
	const current = settings.state.collapsedSections[name] ?? false;
	if (current === collapsed) return;
	if (collapsed) {
		settings.state.collapsedSections[name] = true;
	} else {
		delete settings.state.collapsedSections[name];
	}
	await save();
}

function groupsContainingKey(items: GroceryItem[], key: string, mode: GroupingMode): string[] {
	const item = items.find((i) => i.key === key);
	if (!item) return [];
	if (mode === "category") return [item.category];
	if (mode === "recipe" || mode === "source") return item.sources.map((s) => s.label);
	return [];
}

function itemsInGroup(items: GroceryItem[], groupName: string, mode: GroupingMode): GroceryItem[] {
	if (mode === "category") return items.filter((i) => i.category === groupName);
	if (mode === "recipe" || mode === "source") return items.filter((i) => i.sources.some((s) => s.label === groupName));
	return [];
}

export async function autoCollapseGroups(
	items: GroceryItem[],
	checkedKey: string,
	settings: RecipeBoxSettings,
	save: () => Promise<void>
): Promise<void> {
	if (!settings.autoCollapseCompletedSections) return;

	const groups = groupsContainingKey(items, checkedKey, settings.groupingMode);
	for (const group of groups) {
		if (settings.state.collapsedSections[group]) continue;
		const groupItems = itemsInGroup(items, group, settings.groupingMode);
		if (groupItems.length > 0 && groupItems.every((i) => i.checked)) {
			settings.state.collapsedSections[group] = true;
			await save();
		}
	}
}
