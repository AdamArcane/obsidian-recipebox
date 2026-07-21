/**
 * Grocery list preview card: first 8 unchecked items in the same category
 * order the real grocery view uses, so this preview never disagrees with
 * what the user sees when they click through. See dashboard-spec.md section 5.
 */
import { GroceryItem } from "../../types";
import { buildDisplayGroups } from "../grocery-view/display-groups";
import { toTitleCase } from "../../utils/text-case";

const PREVIEW_ITEM_LIMIT = 8;

export interface GroceryPreviewActions {
	toggleChecked: (key: string, checked: boolean) => void;
	openGroceryView: () => void;
}

export function renderGroceryPreview(
	container: HTMLElement,
	items: GroceryItem[],
	actions: GroceryPreviewActions,
): void {
	const card = container.createDiv({ cls: "rb-dashboard-card rb-dashboard-grocery-preview rb-dashboard-span-4" });
	card.createDiv({ cls: "rb-dashboard-card-label", text: "Grocery list" });

	const unchecked = items.filter((i) => !i.checked);
	if (unchecked.length === 0) {
		card.createDiv({ cls: "rb-dashboard-empty-text", text: "Grocery list is empty." });
	} else {
		const ordered = buildDisplayGroups(unchecked, "category").flatMap((g) => g.items);
		const shown = ordered.slice(0, PREVIEW_ITEM_LIMIT);
		const remaining = ordered.length - shown.length;

		const list = card.createDiv({ cls: "rb-dashboard-grocery-list" });
		for (const item of shown) {
			const row = list.createDiv({ cls: "rb-dashboard-grocery-row" });
			const checkbox = row.createEl("input", { type: "checkbox" });
			checkbox.addEventListener("change", () => actions.toggleChecked(item.key, checkbox.checked));
			row.createSpan({ cls: "rb-dashboard-grocery-name", text: toTitleCase(item.name) });
		}
		if (remaining > 0) list.createDiv({ cls: "rb-dashboard-grocery-more", text: `+${remaining} more` });
	}

	const footer = card.createEl("button", { cls: "rb-dashboard-footer-btn", text: "View grocery list →" });
	footer.addEventListener("click", () => actions.openGroceryView());
}
