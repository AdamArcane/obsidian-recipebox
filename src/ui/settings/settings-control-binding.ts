/**
 * Key-based read/write helpers behind the settings tab's native controls.
 * Kept out of the tab so the lookup is testable and the tab stays thin.
 */
import { RecipeBoxSettings } from "../../settings/settings-types";

export function readSettingValue(settings: RecipeBoxSettings, key: string): unknown {
	return (settings as unknown as Record<string, unknown>)[key];
}

export function writeSettingValue(settings: RecipeBoxSettings, key: string, value: unknown): void {
	(settings as unknown as Record<string, unknown>)[key] = value;
}
