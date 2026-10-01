/**
 * Assembles the three headed top-level groups of the Obsidian 1.13+
 * declarative settings tree. Each group lives in its own builder file.
 */
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { buildLibraryDataGroup } from "./settings-group-library-data";
import { buildViewingCookingGroup } from "./settings-group-viewing-cooking";
import { buildPlanningShoppingGroup } from "./settings-group-planning-shopping";

export function buildDeclarativeSettingDefinitions(
	ctx: SettingsBuildContext,
): SettingsDefinition[] {
	return [
		buildLibraryDataGroup(ctx),
		buildViewingCookingGroup(ctx),
		buildPlanningShoppingGroup(ctx),
	];
}
