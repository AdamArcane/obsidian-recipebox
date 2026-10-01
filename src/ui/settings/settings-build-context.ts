/**
 * Shared context and key types passed to each settings group builder.
 */
import { App, SettingDefinitionItem } from "obsidian";
import RecipeBoxPlugin from "../../main";
import { RecipeBoxSettings } from "../../settings/settings-types";

export interface SettingsBuildContext {
	app: App;
	plugin: RecipeBoxPlugin;
}

// Typing control keys against the settings shape makes a mistyped key fail typecheck.
// Extract (not `& string`) keeps the no-redundant-type-constituents lint rule happy.
export type SettingsKey = Extract<keyof RecipeBoxSettings, string>;
export type SettingsDefinition = SettingDefinitionItem<SettingsKey>;
