import { App, Setting } from "obsidian";
import { GroupingMode, CategorySource } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { CategoryOrderModal } from "../modals/modal-category-order";
import { CategoryOverridesModal } from "../modals/modal-category-overrides";

const GROUPING_OPTIONS: Record<GroupingMode, string> = {
	category: "By category", recipe: "By recipe",
	source: "By source", none: "No grouping",
};
const CATEGORY_SOURCE_OPTIONS: Record<CategorySource, string> = {
	dictionary: "Built-in dictionary",
	tag: "Recipe tags",
	"tag-then-dictionary": "Tags, then dictionary",
};

export function renderSectionShopping(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getKnownCategories: () => string[],
): void {
	new Setting(container).setName("Shopping assistant").setHeading();

	new Setting(container)
		.setName("Grouping mode")
		.addDropdown((dd) =>
			dd.addOptions(GROUPING_OPTIONS).setValue(settings.groupingMode)
				.onChange(async (v) => { settings.groupingMode = v as GroupingMode; await save(); })
		);

	new Setting(container)
		.setName("Category source")
		.addDropdown((dd) =>
			dd.addOptions(CATEGORY_SOURCE_OPTIONS).setValue(settings.categorySource)
				.onChange(async (v) => { settings.categorySource = v as CategorySource; await save(); })
		);

	new Setting(container)
		.setName("Auto-sort categories alphabetically")
		.addToggle((t) =>
			t.setValue(settings.autoSortCategories).onChange(async (v) => {
				settings.autoSortCategories = v;
				await save();
				rerender();
			})
		);

	if (!settings.autoSortCategories) {
		new Setting(container)
			.setName("Category order")
			.setDesc("Set the display order for grocery list categories.")
			.addButton((btn) =>
				btn.setButtonText("Edit category order…").onClick(() => {
					new CategoryOrderModal(app, settings, save).open();
				})
			);
	}

	new Setting(container)
		.setName("Auto-collapse completed sections")
		.addToggle((t) =>
			t.setValue(settings.autoCollapseCompletedSections).onChange(async (v) => {
				settings.autoCollapseCompletedSections = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Category overrides")
		.setDesc("Map ingredient substrings to specific categories.")
		.addButton((btn) =>
			btn.setButtonText("Edit overrides…").onClick(() => {
				new CategoryOverridesModal(app, settings, save, getKnownCategories).open();
			})
		);
}
