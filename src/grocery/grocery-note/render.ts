import { RecipeBoxSettings } from "../../settings/settings-types";
import { formatQuantity } from "../../parser/quantity-format";
import { GrocerySection } from "./parse";

export function renderGroceryLine(name: string, unit: string, quantity: number | null, checked: boolean): string {
	const checkbox = checked ? "- [x] " : "- [ ] ";
	const qty = quantity !== null ? formatQuantity(quantity) : "";
	const prefix = qty ? (unit ? `${qty} ${unit} ` : `${qty} `) : (unit ? `${unit} ` : "");
	return `${checkbox}${prefix}${name}`;
}

export function renderGrocerySections(sections: GrocerySection[], settings: RecipeBoxSettings): string {
	const order = settings.manualCategoryOrder;

	const sorted = [...sections].sort((a, b) => {
		const ai = order.indexOf(a.category);
		const bi = order.indexOf(b.category);
		if (ai >= 0 && bi >= 0) return ai - bi;
		if (ai >= 0) return -1;
		if (bi >= 0) return 1;
		return a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
	});

	const lines: string[] = ["# Grocery List", ""];
	for (const section of sorted) {
		const content = section.lines.filter((l) => l.raw.trim());
		if (content.length === 0) continue;
		lines.push(`## ${section.category}`);
		lines.push(...content.map((l) => l.raw));
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}
