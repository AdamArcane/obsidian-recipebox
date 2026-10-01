/**
 * Obsidian settings tab. Builds the declarative (1.13+) definition tree and
 * routes native control reads and writes through the plugin's settings.
 */
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { buildDeclarativeSettingDefinitions } from "./settings-tab-declarative";
import { readSettingValue, writeSettingValue } from "./settings-control-binding";

export class RecipeBoxSettingsTab extends PluginSettingTab {
	private plugin: RecipeBoxPlugin;

	constructor(app: App, plugin: RecipeBoxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return buildDeclarativeSettingDefinitions({ app: this.app, plugin: this.plugin });
	}

	getControlValue(key: string): unknown {
		return readSettingValue(this.plugin.settings, key);
	}

	// Overridden so every native control save ends in plugin.saveSettings().
	// The default may persist via saveData directly, which would skip the
	// recipe view, gallery, and ribbon refreshes that saveSettings performs.
	async setControlValue(key: string, value: unknown): Promise<void> {
		writeSettingValue(this.plugin.settings, key, value);
		await this.plugin.saveSettings();
	}
}
