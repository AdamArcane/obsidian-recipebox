import { GroceryItem } from "../types";
import { ExportFormat } from "./export-format";
import { renderLine, RenderOptions } from "./export-render-line";

export function exportGroceryList(
	items: GroceryItem[],
	format: ExportFormat,
	options: RenderOptions = { includeChecked: true }
): string {
	const filtered = options.includeChecked ? items : items.filter((i) => !i.checked);
	if (filtered.length === 0) return "";

	if (format === "grouped") {
		const groups = new Map<string, GroceryItem[]>();
		for (const item of filtered) {
			const cat = item.category || "Other";
			if (!groups.has(cat)) groups.set(cat, []);
			groups.get(cat)!.push(item);
		}
		const lines: string[] = [];
		for (const [cat, catItems] of groups) {
			lines.push(`## ${cat}`);
			for (const item of catItems) {
				lines.push(renderLine(item, format, options));
			}
			lines.push("");
		}
		return lines.join("\n").trimEnd();
	}

	const sorted = [...filtered].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	);
	return sorted.map((item) => renderLine(item, format, options)).join("\n");
}
