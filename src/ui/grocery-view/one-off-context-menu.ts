/**
 * Shows a context menu for a one-off grocery item, offering edit, category
 * override, and remove actions.
 */
import { Menu } from "obsidian";
import { OneOffItem } from "../../types";
import { LongPressPosition } from "./long-press";
import { GroceryViewDeps } from "./grocery-view-deps";

export function openOneOffContextMenu(
	pos: LongPressPosition,
	item: OneOffItem,
	deps: GroceryViewDeps
): void {
	const menu = new Menu();

	menu.addItem((menuItem) => {
		menuItem.setTitle("Edit item…").setIcon("pencil");
		menuItem.onClick(() => deps.openAddOneOffModal(item));
	});

	menu.addItem((menuItem) => {
		menuItem.setTitle("Move to category…").setIcon("folder");
		menuItem.onClick(() => {
			const sub = new Menu();
			const categories = deps.getKnownCategories();

			sub.addItem((autoItem) => {
				autoItem.setTitle("Auto-detect").setChecked(!item.categoryOverride);
				autoItem.onClick(() =>
					deps.updateOneOff(item.id, { categoryOverride: null })
				);
			});

			for (const cat of categories) {
				sub.addItem((catItem) => {
					catItem.setTitle(cat).setChecked(item.categoryOverride === cat);
					catItem.onClick(() =>
						deps.updateOneOff(item.id, { categoryOverride: cat })
					);
				});
			}

			sub.addSeparator();

			sub.addItem((newCatItem) => {
				newCatItem.setTitle("New category…").setIcon("plus");
				newCatItem.onClick(() => deps.openAddOneOffModal(item));
			});

			sub.showAtPosition(pos);
		});
	});

	menu.addSeparator();

	menu.addItem((removeItem) => {
		removeItem.setTitle("Remove").setIcon("trash-2").setWarning(true);
		removeItem.onClick(() => deps.removeOneOff(item.id));
	});

	menu.showAtPosition(pos);
}
