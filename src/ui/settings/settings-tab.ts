/**
 * Obsidian settings tab that assembles all plugin settings sections into a
 * single scrollable settings page.
 */
import { App, PluginSettingTab } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { renderSectionLibrary } from "./section-library";
import { renderSectionNotesStorage } from "./section-notes-storage";
import { renderSectionImporter } from "./section-importer";
import { renderSectionRecipeView } from "./section-recipe-view";
import { renderSectionTimers } from "./section-timers";
import { renderSectionShopping } from "./section-shopping";
import { renderSectionCookingTracking } from "./section-cooking-tracking";
import { renderSectionNutrition } from "./section-nutrition";
import { renderSectionRecommender } from "./section-recommender";
import { renderSectionHealthSafety } from "./section-health-safety";
import { renderSectionMealPlan as renderSectionMealPlan } from "./section-meal-plan";

export class RecipeBoxSettingsTab extends PluginSettingTab {
	private plugin: RecipeBoxPlugin;

	constructor(app: App, plugin: RecipeBoxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		this.containerEl.empty();

		const save = async (): Promise<void> => { await this.plugin.saveSettings(); };
		const rerender = (): void => { this.rerenderPreservingScroll(); };

		renderSectionLibrary(this.containerEl, this.plugin.settings, save, rerender, this.app);
		renderSectionNotesStorage(this.containerEl, this.plugin.settings, save, rerender, this.app);
		renderSectionImporter(this.containerEl, this.plugin.settings, save, rerender, this.app);
		renderSectionRecipeView(this.containerEl, this.plugin.settings, save, rerender, this.app, () => this.plugin.discoveryCache.get());
		renderSectionTimers(this.containerEl, this.plugin.settings, save, rerender);
		renderSectionShopping(this.containerEl, this.plugin.settings, save, rerender, this.app, () => this.plugin.manager.getKnownCategories());
		renderSectionCookingTracking(this.containerEl, this.plugin.settings, save, rerender);
		renderSectionNutrition(this.containerEl, this.plugin.settings, save, rerender);
		renderSectionRecommender(this.containerEl, this.plugin.settings, save, rerender, this.app, () => this.plugin.discoveryCache.get());
		renderSectionHealthSafety(this.containerEl, this.plugin.settings, save, rerender, this.app);
		renderSectionMealPlan(this.containerEl, this.plugin.settings, save, rerender, this.app);
	}

	private rerenderPreservingScroll(): void {
		const scrollTop = this.containerEl.scrollTop;
		this.renderSettings();
		this.containerEl.scrollTop = scrollTop;
	}
}
