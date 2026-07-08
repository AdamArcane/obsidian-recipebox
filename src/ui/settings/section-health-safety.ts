/**
 * Settings section for health and dietary safety — personal allergen list,
 * meat temperature warnings, high-GI warnings, and the GI pattern dictionary
 * editor. Collapsed by default since most users never need to touch it.
 */
import { App, Setting } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { AllergensModal } from "../modals/modal-allergens";
import { GiDictionaryModal } from "../modals/modal-gi-dictionary";
import { createCollapsibleSection } from "../components/collapsible-section";

export function renderSectionHealthSafety(
	container: HTMLElement,
	settings: RecipeBoxSettings,
	save: () => Promise<void>,
	rerender: () => void,
	app: App
): void {
	createCollapsibleSection(container, "Health & safety", (body) => {
		new Setting(body)
			.setName("My allergens")
			.setDesc(`Warn when a recipe contains any of these: ${settings.myAllergens.length > 0 ? settings.myAllergens.join(", ") : "None configured"}`)
			.addButton((btn) =>
				btn.setButtonText("Edit allergens…").onClick(() => {
					new AllergensModal(app, settings, save).open();
				})
			);

		new Setting(body)
			.setName("Show meat temperature warnings")
			.setDesc("Warn when an ingredient may need to reach a safe internal temperature.")
			.addToggle((t) =>
				t.setValue(settings.showMeatTempWarnings).onChange(async (v) => {
					settings.showMeatTempWarnings = v;
					await save();
				})
			);

		new Setting(body)
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
			new Setting(body)
				.setName("High-gi dictionary")
				.setDesc("Regex patterns identifying high-gi ingredients.")
				.addButton((btn) =>
					btn.setButtonText("Edit gi dictionary…").onClick(() => {
						new GiDictionaryModal(app, settings, save).open();
					})
				);
		}
	});
}
