/**
 * "Integrations" top-level group: one page per third party service, so new
 * integrations are added here as another entry in `items` and nothing else
 * in the settings tree has to change.
 */
import { SettingsBuildContext, SettingsDefinition } from "./settings-build-context";
import { buildPantryPage } from "../../integrations/pantry/pantrySettings";

export function buildIntegrationsGroup(ctx: SettingsBuildContext): SettingsDefinition {
	return {
		type: "group",
		heading: "Integrations",
		items: [
			buildPantryPage(ctx),
		],
	};
}
