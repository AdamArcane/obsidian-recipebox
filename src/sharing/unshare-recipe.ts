/**
 * Orchestrates revoking a share: calls the Worker delete endpoint, then
 * clears local frontmatter state regardless of the call's outcome -- a
 * stale token pointing at an already-gone (or already-expired) share
 * shouldn't block the user from clearing their own note's local state.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { getShareData, clearShareData } from "./share-frontmatter";
import { deleteShare, ShareNotFoundError } from "./share-worker-client";
import { getOrCreateUserIdentity } from "./user-identity";

export async function unshareRecipe(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	saveSettings: () => Promise<void>,
): Promise<void> {
	const cache = app.metadataCache.getFileCache(file);
	const data = getShareData(cache, settings);
	if (!data) return;

	const { userShortId } = await getOrCreateUserIdentity(settings, saveSettings);

	try {
		await deleteShare(settings.shareServerUrl, userShortId, data.slug, data.token);
	} catch (err) {
		if (!(err instanceof ShareNotFoundError)) throw err;
	}

	await clearShareData(app, file, settings);
}
