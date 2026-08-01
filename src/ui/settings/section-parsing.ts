/**
 * Settings section for ingredient parsing: the recipe language whose unit
 * vocabulary is recognised, plus per-household alias overrides.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { localeOptions } from "../../parser/locales";
import { UnitAliasesModal } from "../modals/modal-unit-aliases";
import { createCollapsibleSection } from "../components/collapsible-section";

export function renderSectionParsing(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	createCollapsibleSection(container, "Ingredient parsing", (body) => {
		new Setting(body)
			.setName("Recipe language")
			.setDesc(
				"Units written in this language are recognised alongside the built-in ones, so amounts scale and the grocery list can merge them. " +
				"Changing it changes how existing grocery lines are read, so entries added under the old language may not merge with new ones until you clear the list."
			)
			.addDropdown((d) =>
				d
					.addOptions(localeOptions())
					.setValue(settings.recipeLocale)
					.onChange(async (v) => {
						settings.recipeLocale = v;
						await save();
						rerender();
					})
			);

		new Setting(body)
			.setName("Unit aliases")
			.setDesc("Map your own spellings onto a unit. These win over the selected language and the built-in units.")
			.addButton((btn) =>
				btn.setButtonText("Edit unit aliases…").onClick(() => {
					new UnitAliasesModal(app, settings, save).open();
				})
			);
	});
}
