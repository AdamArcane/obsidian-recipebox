import { GroceryItem } from "../types";
import { ExportFormat } from "./export-format";
import { formatQuantity } from "../parser/quantity-format";
import { toTitleCase } from "../utils/text-case";

export interface RenderOptions {
	includeChecked: boolean;
}

export function renderLine(
	item: GroceryItem,
	format: ExportFormat,
	options: RenderOptions
): string {
	const displayName = toTitleCase(item.name);
	const qty = item.quantity !== null ? formatQuantity(item.quantity) : "";
	const suffix = qty ? ` (${qty}${item.unit ? " " + item.unit : ""})` : "";
	const text = `${displayName}${suffix}`;

	if (format === "plain") return text;

	const checkbox = item.checked && options.includeChecked ? "- [x] " : "- [ ] ";
	return `${checkbox}${text}`;
}
