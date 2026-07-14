/**
 * Orchestrates recipe extraction from a URL or raw text and writes the resulting
 * note to the vault, handling conflicts and social platform edge cases.
 */
import { App, Notice } from "obsidian";
import { RecipeBoxSettings } from "../../settings/settings-types";
import { ExtractedRecipe } from "../../importer/recipe-extract-types";
import { fetchHtml } from "../../importer/recipe-fetch";
import { extractRecipe } from "../../importer/recipe-extract";
import { extractSocialMeta } from "../../importer/social-meta-extract";
import { extractRecipeFromText } from "../../importer/text-recipe-parse";
import { detectPlatform } from "../../importer/social-platform-detect";
import { buildRecipeNote } from "../../importer/note-template-render";
import { titleToFilename } from "../../importer/note-filename";
import { ensureParentFolders } from "../../utils/vault-notes";

export async function submitUrl(url: string): Promise<ExtractedRecipe | null> {
	const trimmed = url.trim();
	if (!trimmed) {
		new Notice("Please enter a URL.");
		return null;
	}

	const platform = detectPlatform(trimmed);

	if (platform === "instagram") {
		new Notice("Instagram is not supported — copy the caption and use text mode instead.");
		return null;
	}


	const { html, error: errMessage } = await fetchHtml(trimmed);
	if (!html) {
		new Notice(`Could not fetch that URL. ${errMessage ?? "The site may be unavailable or require login."}`);
		return null;
	}
	
	if (platform === "youtube" || platform === "tiktok") {	
		const meta = extractSocialMeta(html);
		const recipe = extractRecipeFromText(meta.description, meta.title || undefined);
		if (platform === "tiktok" && meta.description.length < 200) {
			new Notice("Tiktok captions may be truncated in page metadata — double-check ingredient completeness.");
		}
		return recipe;
	}

	const recipe = await extractRecipe(html, trimmed);
	if (!recipe || !recipe.title) {
		new Notice("No recipe found. The site may require login or render content via JavaScript.");
		return null;
	}
	return recipe;
}

export function submitText(text: string, titleOverride: string): ExtractedRecipe | null {
	const trimmed = text.trim();
	if (!trimmed) {
		new Notice("Please paste some recipe text.");
		return null;
	}
	return extractRecipeFromText(trimmed, titleOverride.trim() || undefined);
}

export function resolveDestinationFolder(settings: RecipeBoxSettings): string {
	if (settings.importerDefaultFolder) return settings.importerDefaultFolder;
	if (settings.recipeFolders.length > 0) return settings.recipeFolders[0];
	return "";
}

export async function saveRecipe(
	app: App,
	recipe: ExtractedRecipe,
	folder: string,
	settings: RecipeBoxSettings,
	onConflict: (path: string, proceed: () => Promise<void>) => void,
	onSuccess: (filePath: string) => void,
): Promise<void> {
	const filename = titleToFilename(recipe.title || "Untitled Recipe") + ".md";
	const folderTrimmed = folder.trim();
	const filePath = folderTrimmed ? `${folderTrimmed}/${filename}` : filename;

	const doWrite = async (): Promise<void> => {
		try {
			const content = await buildRecipeNote(app, recipe, settings);
			await ensureParentFolders(app, filePath);
			const existing = app.vault.getFileByPath(filePath);
			if (existing) {
				await app.vault.modify(existing, content);
			} else {
				await app.vault.create(filePath, content);
			}
			new Notice(`Recipe saved: ${filename}`);
			onSuccess(filePath);
		} catch (err) {
			new Notice(`Failed to save recipe: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	if (app.vault.getFileByPath(filePath)) {
		onConflict(filePath, doWrite);
	} else {
		await doWrite();
	}
}
