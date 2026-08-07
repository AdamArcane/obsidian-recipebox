/**
 * Obsidian settings tab that assembles all plugin settings sections into a
 * single scrollable settings page.
 */
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { buildDeclarativeSettingDefinitions } from "./settings-tab-declarative";
import { renderLegacySettings } from "./settings-tab-legacy";

export class RecipeBoxSettingsTab extends PluginSettingTab {
	private plugin: RecipeBoxPlugin;

	constructor(app: App, plugin: RecipeBoxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return buildDeclarativeSettingDefinitions({
			app: this.app,
			plugin: this.plugin,
			containerEl: this.containerEl,
		});
	}

	// Obsidian < 1.13.0 fallback renderer.
	display(): void {
		renderLegacySettings({
			app: this.app,
			plugin: this.plugin,
			containerEl: this.containerEl,
			rerender: () => this.rerenderPreservingScroll(),
		});
	}

	private rerenderPreservingScroll(): void {
		const scrollTop = this.containerEl.scrollTop;
		renderLegacySettings({
			app: this.app,
			plugin: this.plugin,
			containerEl: this.containerEl,
			rerender: () => this.rerenderPreservingScroll(),
		});
		this.containerEl.scrollTop = scrollTop;
	}
}
