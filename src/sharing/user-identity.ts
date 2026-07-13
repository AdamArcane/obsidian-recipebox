/**
 * Reads or lazily creates the plugin-level sharing identity: a full UUID
 * (`userGuid`, internal only, never sent in URLs) and a 6-character public
 * namespace segment (`userShortId`, used in share URLs). Both are generated
 * once on first share and persisted to data.json via the settings object --
 * never regenerated afterwards.
 */
import { RecipeBoxSettings } from "../settings/settings-types";

const SHORT_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateShortId(): string {
	let id = "";
	for (let i = 0; i < 6; i++) {
		id += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)];
	}
	return id;
}

export interface UserIdentity {
	userGuid: string;
	userShortId: string;
}

export async function getOrCreateUserIdentity(
	settings: RecipeBoxSettings,
	saveSettings: () => Promise<void>,
): Promise<UserIdentity> {
	if (settings.userGuid && settings.userShortId) {
		return { userGuid: settings.userGuid, userShortId: settings.userShortId };
	}
	settings.userGuid = settings.userGuid || crypto.randomUUID();
	settings.userShortId = settings.userShortId || generateShortId();
	await saveSettings();
	return { userGuid: settings.userGuid, userShortId: settings.userShortId };
}
