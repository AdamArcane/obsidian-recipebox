/**
 * Imperative settings renderer used as the Obsidian < 1.13 fallback.
 */
import { App } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { renderSectionLibrary } from "./section-library";
import { renderSectionNotesStorage } from "./section-notes-storage";
import { renderSectionImporter } from "./section-importer";
import { renderSectionRecipeView } from "./section-recipe-view";
import { renderSectionTimers } from "./section-timers";
import { renderSectionShopping } from "./section-shopping";
import { renderSectionCookingTracking } from "./section-cooking-tracking";
import { renderSectionNutrition } from "./section-nutrition";
import { renderSectionSuggester } from "./section-suggester";
import { renderSectionHealthSafety } from "./section-health-safety";
import { renderSectionMealPlan as renderSectionMealPlan } from "./section-meal-plan";
import { renderSectionPropertyNames } from "./section-property-names";
import { renderSectionExport } from "./section-export";
import { renderSectionSharing } from "./section-sharing";

interface LegacySettingsContext {
	app: App;
	plugin: RecipeBoxPlugin;
	containerEl: HTMLElement;
	rerender: () => void;
}

export function renderLegacySettings(context: LegacySettingsContext): void {
	context.containerEl.empty();

	const save = async (): Promise<void> => {
		await context.plugin.saveSettings();
	};

	renderSectionLibrary(context.containerEl, context.plugin.settings, save, context.rerender, context.app);
	renderSectionNotesStorage(context.containerEl, context.plugin.settings, save, context.rerender, context.app);
	renderSectionRecipeView(context.containerEl, context.plugin.settings, save, context.rerender, context.app, () => context.plugin.discoveryCache.get());
	renderSectionCookingTracking(context.containerEl, context.plugin.settings, save, context.rerender);
	renderSectionMealPlan(context.containerEl, context.plugin.settings, save, context.rerender);
	renderSectionShopping(
		context.containerEl,
		context.plugin.settings,
		save,
		context.rerender,
		context.app,
		() => context.plugin.manager.getKnownCategories(),
	);
	renderSectionSuggester(context.containerEl, context.plugin.settings, save, context.rerender, context.app, () => context.plugin.discoveryCache.get());
	renderSectionTimers(context.containerEl, context.plugin.settings, save, context.rerender);
	renderSectionNutrition(context.containerEl, context.plugin.settings, save, context.rerender);
	renderSectionHealthSafety(context.containerEl, context.plugin.settings, save, context.rerender, context.app);
	renderSectionImporter(context.containerEl, context.plugin.settings, save, context.rerender, context.app);
	renderSectionPropertyNames(context.containerEl, context.plugin.settings, save, context.rerender);
	renderSectionExport(context.containerEl, context.plugin.settings, save, context.rerender, context.app);
	renderSectionSharing(context.containerEl, context.plugin.settings, save, context.rerender);
}
