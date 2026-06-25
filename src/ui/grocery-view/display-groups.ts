/**
 * Groups the flat GroceryItem list into DisplayGroups according to the current
 * grouping mode (category, recipe/source, or none).
 */
import { GroceryItem, GroupingMode } from "../../types";

export interface DisplayGroup {
	name: string;
	items: GroceryItem[];
}

export function buildDisplayGroups(items: GroceryItem[], mode: GroupingMode): DisplayGroup[] {
	if (items.length === 0) return [];
	if (mode === "none") return [{ name: "", items: [...items] }];

	if (mode === "category") {
		const map = new Map<string, GroceryItem[]>();
		for (const item of items) {
			const cat = item.category || "Other";
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push(item);
		}
		return [...map.entries()].map(([name, grpItems]) => ({ name, items: grpItems }));
	}

	// recipe / source: item appears once per matching source label
	const map = new Map<string, GroceryItem[]>();
	for (const item of items) {
		for (const source of item.sources) {
			if (!map.has(source.label)) map.set(source.label, []);
			map.get(source.label)!.push(item);
		}
	}
	return [...map.entries()].map(([name, grpItems]) => ({ name, items: grpItems }));
}
