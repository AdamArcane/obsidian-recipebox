/**
 * Turns plugin settings into a ready PantryClient. Returns null when setup is
 * incomplete, so callers can say so in plain words instead of failing a request.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { PantryClient, normalizeServerUrl } from "./PantryClient";

export function pantryClientFromSettings(app: App, s: RecipeBoxSettings): { client: PantryClient } | null {
	const password = s.pantryAppPassword ? app.secretStorage.getSecret(s.pantryAppPassword) : null;
	if (!normalizeServerUrl(s.pantryServerUrl) || !s.pantryUsername || !password || !s.pantryHouseId || !s.pantryListId) return null;
	return {
		client: new PantryClient({
			serverUrl: s.pantryServerUrl,
			username: s.pantryUsername,
			appPassword: password,
			houseId: s.pantryHouseId,
		}),
	};
}

/** Client for the settings pickers, which run before a house or list is chosen. */
export function pantryPickerClient(app: App, s: RecipeBoxSettings, houseId?: number): PantryClient | null {
	const password = s.pantryAppPassword ? app.secretStorage.getSecret(s.pantryAppPassword) : null;
	if (!normalizeServerUrl(s.pantryServerUrl) || !s.pantryUsername || !password) return null;
	return new PantryClient({ serverUrl: s.pantryServerUrl, username: s.pantryUsername, appPassword: password, houseId });
}
