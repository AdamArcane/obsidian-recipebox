/**
 * Settings section for shopping list behaviour — grouping mode, category source,
 * auto-sort, manual order, category overrides, and auto-collapse.
 */
import { t as translateUi } from "../../i18n";
import { App, Setting } from "obsidian";
import { GroupingMode, CategorySource } from "../../types";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { CategoryOrderModal } from "../modals/modal-category-order";
import { CategoryOverridesModal } from "../modals/modal-category-overrides";

const GROUPING_OPTIONS: Record<GroupingMode, string> = {
	category: translateUi("By category"), recipe: translateUi("By recipe"),
	source: translateUi("By source"), none: translateUi("No grouping"),
};
const CATEGORY_SOURCE_OPTIONS: Record<CategorySource, string> = {
	dictionary: translateUi("Built-in dictionary"),
	tag: translateUi("Recipe tags"),
	"tag-then-dictionary": translateUi("Tags, then dictionary"),
};

export function renderSectionShopping(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App,
	getKnownCategories: () => string[],
): void {
	new Setting(container)
		.setName(translateUi("Default grouping"))
		.addDropdown((dd) =>
			dd.addOptions(GROUPING_OPTIONS).setValue(settings.groupingMode)
				.onChange(async (v) => { settings.groupingMode = v as GroupingMode; await save(); })
		);

	new Setting(container)
		.setName(translateUi("Category source"))
		.addDropdown((dd) =>
			dd.addOptions(CATEGORY_SOURCE_OPTIONS).setValue(settings.categorySource)
				.onChange(async (v) => { settings.categorySource = v as CategorySource; await save(); })
		);

	new Setting(container)
		.setName(translateUi("Auto-sort categories alphabetically"))
		.addToggle((t) =>
			t.setValue(settings.autoSortCategories).onChange(async (v) => {
				settings.autoSortCategories = v;
				await save();
				rerender();
			})
		);

	if (!settings.autoSortCategories) {
		new Setting(container)
			.setName(translateUi("Category order"))
			.setDesc(translateUi("Set the display order for grocery list categories."))
			.addButton((btn) =>
				btn.setButtonText(translateUi("Edit category order…")).onClick(() => {
					new CategoryOrderModal(app, settings, save).open();
				})
			);
	}

	new Setting(container)
		.setName(translateUi("Auto-collapse completed sections"))
		.addToggle((t) =>
			t.setValue(settings.autoCollapseCompletedSections).onChange(async (v) => {
				settings.autoCollapseCompletedSections = v;
				await save();
			})
		);

	new Setting(container)
		.setName(translateUi("Category overrides"))
		.setDesc(translateUi("Map ingredient substrings to specific categories."))
		.addButton((btn) =>
			btn.setButtonText(translateUi("Edit overrides…")).onClick(() => {
				new CategoryOverridesModal(app, settings, save, getKnownCategories).open();
			})
		);
}
