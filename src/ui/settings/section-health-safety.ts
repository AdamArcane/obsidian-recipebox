/**
 * Settings section for health and dietary safety — personal allergen list,
 * high-GI warnings, and the GI pattern dictionary editor.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { migrateModeFieldReferences } from "../../suggester/migrate-mode-fields";
import { AllergensModal } from "../modals/modal-allergens";
import { GiDictionaryModal } from "../modals/modal-gi-dictionary";

export function renderSectionHealthSafety(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	new Setting(container).setName("Health & safety").setHeading();

	new Setting(container)
		.setName("Allergens frontmatter property")
		.setDesc("Property name holding a recipe's allergen list (CSV string or YAML list).")
		.addText((t) => {
			t.setValue(settings.allergensProperty).onChange(async (v) => {
				settings.suggesterModes = migrateModeFieldReferences(settings.suggesterModes, settings.allergensProperty, v);
				settings.allergensProperty = v;
				await save();
			});
			t.inputEl.addEventListener("blur", () => rerender());
		});

	new Setting(container)
		.setName("My allergens")
		.setDesc(`${settings.myAllergens.length > 0 ? settings.myAllergens.join(", ") : "None configured"} — warn when a recipe contains any of these.`)
		.addButton((btn) =>
			btn.setButtonText("Edit allergens…").onClick(() => {
				new AllergensModal(app, settings, save).open();
			})
		);

	new Setting(container)
		.setName("Show meat temperature warnings")
		.setDesc("Warn when an ingredient may need to reach a safe internal temperature.")
		.addToggle((t) =>
			t.setValue(settings.showMeatTempWarnings).onChange(async (v) => {
				settings.showMeatTempWarnings = v;
				await save();
			})
		);

	new Setting(container)
		.setName("Show high-gi ingredients warnings")
		.setDesc("Flag high-glycemic-index ingredients in the recipe view.")
		.addToggle((t) =>
			t.setValue(settings.showHighGIWarnings).onChange(async (v) => {
				settings.showHighGIWarnings = v;
				await save();
				rerender();
			})
		);

	if (settings.showHighGIWarnings) {
		new Setting(container)
			.setName("High-gi dictionary")
			.setDesc("Regex patterns identifying high-gi ingredients.")
			.addButton((btn) =>
				btn.setButtonText("Edit gi dictionary…").onClick(() => {
					new GiDictionaryModal(app, settings, save).open();
				})
			);
	}
}
