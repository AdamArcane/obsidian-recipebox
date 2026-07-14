/**
 * Orchestrates creating a share: builds the export data snapshot, renders
 * it to HTML, calls the Worker, and writes the resulting share state to
 * frontmatter. Callers (share-modal.ts) are responsible for UI concerns.
 */
import { App, TFile } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { buildRecipeExportData, DEFAULT_RECIPE_EXPORT_OPTIONS } from "../recipe-export/recipe-export-data";
import { buildShareHtml } from "./build-share-html";
import { resolveShareImage } from "./resolve-share-image";
import { createShare, CreateShareResponse } from "./share-worker-client";
import { setShareData } from "./share-frontmatter";
import { getOrCreateUserIdentity } from "./user-identity";
import { toShareableRecipeData } from "./share-export-data";
import { getSharerAccentColor } from "./get-sharer-accent-color";

export interface ShareRecipeOptions {
	name: string;
	expiresInDays: 7 | 30 | 90;
}

export interface ShareRecipeResult {
	share: CreateShareResponse;
	/** Set when the recipe's image had to be left out (unsupported format or too large even after compression). */
	imageOmittedReason: string | null;
}

export async function shareRecipe(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
	saveSettings: () => Promise<void>,
	opts: ShareRecipeOptions,
): Promise<ShareRecipeResult> {
	const { userShortId } = await getOrCreateUserIdentity(settings, saveSettings);

	const cache = app.metadataCache.getFileCache(file);
	const frontmatter: Record<string, unknown> = cache?.frontmatter ?? {};
	// A shared link is a canonical snapshot, not tied to whoever's current
	// scaling/private-notes state happened to be set: base recipe, no
	// cook history or other private trailing sections.
	const data = await buildRecipeExportData(app, file, settings, {
		...DEFAULT_RECIPE_EXPORT_OPTIONS,
		includeCookHistoryAndSections: false,
		applyCurrentMultiplier: false,
	});
	const { image, omittedReason } = await resolveShareImage(app, data, frontmatter);
	const html = buildShareHtml(toShareableRecipeData(data), frontmatter, settings, image, getSharerAccentColor());

	const share = await createShare(settings.shareServerUrl, {
		userShortId,
		name: opts.name,
		html,
		expiresInDays: opts.expiresInDays,
	});

	await setShareData(app, file, settings, {
		slug: share.recipeSlug,
		token: share.token,
		created: new Date().toISOString(),
		expires: share.expiresAt,
	});

	return { share, imageOmittedReason: omittedReason };
}
