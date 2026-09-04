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
import { downloadRecipeImage } from "../../importer/download-recipe-image";

export type SubmitUrlResult =
	| { kind: "success"; recipe: ExtractedRecipe; warning: string | null }
	| { kind: "error"; message: string };

export async function submitUrl(url: string): Promise<SubmitUrlResult> {
	const trimmed = url.trim();
	if (!trimmed) {
		return { kind: "error", message: "Please enter a URL." };
	}

	const platform = detectPlatform(trimmed);

	if (platform === "instagram") {
		return { kind: "error", message: "Instagram is not supported — copy the caption and use text mode instead." };
	}

	const { html, error: errMessage } = await fetchHtml(trimmed);
	if (!html) {
		return { kind: "error", message: `Could not fetch that URL. ${errMessage ?? "The site may be unavailable or require login."}` };
	}

	if (platform === "youtube" || platform === "tiktok") {
		const meta = extractSocialMeta(html);
		const recipe = extractRecipeFromText(meta.description, meta.title || undefined);
		if (platform === "tiktok" && meta.description.length < 200) {
			new Notice("Tiktok captions may be truncated in page metadata — double-check ingredient completeness.");
		}
		return { kind: "success", recipe, warning: null };
	}

	const { recipe, usedAuthorFallback } = await extractRecipe(html, trimmed);
	if (!recipe) {
		return { kind: "error", message: "No recipe found. The site may require login or render content via JavaScript." };
	}
	// The fallback author (this site's hostname) only exists to satisfy
	// recipe-scrapers' extraction requirements internally -- it's never
	// written into the saved note -- but a missing author byline can be a
	// sign the page's structured data was thin elsewhere too, so it's worth
	// flagging for a closer look before saving.
	const warning: string | null = usedAuthorFallback
		? "This site didn't list a recipe author. The import still worked, but double-check the details below since the page's structured data may be incomplete."
		: null;
	return { kind: "success", recipe, warning };
}

export function submitText(text: string, titleOverride: string): ExtractedRecipe | null {
	const trimmed = text.trim();
	if (!trimmed) {
		new Notice("Please paste some recipe text.");
		return null;
	}
	return extractRecipeFromText(trimmed, titleOverride.trim() || undefined);
}

/** A blank starting point for the Add Recipe form -- every string field
 * empty, every numeric/nullable field null, no ingredient/step/note groups.
 * The form's default state; Import from URL/Text replace it in place. */
export function blankRecipe(): ExtractedRecipe {
	return {
		title: "",
		description: "",
		heroImage: null,
		servings: null,
		prepTime: null,
		cookTime: null,
		totalTime: null,
		ingredientGroups: [],
		instructionGroups: [],
		notesGroups: [],
		sourceUrl: "",
		calories: null,
		protein: null,
		fat: null,
		carbs: null,
	};
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
			// Attempt to download the hero image into the vault before rendering
			// the note template, so the template sees the vault path instead of
			// a raw URL. Best-effort: failure falls back to the original URL and
			// never blocks the import.
			let recipeToSave = recipe;
			if (settings.downloadImagesOnImport && recipe.heroImage) {
				const imagePath = await downloadRecipeImage(app, recipe.heroImage, recipe.title || "recipe", folderTrimmed);
				if (imagePath) recipeToSave = { ...recipe, heroImage: imagePath };
			}
			const content = await buildRecipeNote(app, recipeToSave, settings);
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
