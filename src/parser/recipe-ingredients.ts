/**
 * Reads and parses all ingredient lines from a recipe file, applying the
 * configured multiplier and filtering out lines tagged with #ignoreIngredient.
 */
import { App, TFile, CachedMetadata } from "obsidian";
import { RecipeIngredient } from "../types";
import { RecipeBoxSettings } from "../settings/settings-types";
import { parseIngredientLine } from "./ingredient-parse";
import { hasIgnoreTag } from "./ingredient-clean";
import { findHeadingIndex } from "./recipe-heading-search";
import { stripFrontmatter } from "./recipe-frontmatter-strip";
import { readRecipeMultiplier } from "./recipe-multiplier";

const LIST_ITEM_RE = /^[-*+]\s|^\d+\.\s/;

export function extractIngredientLines(body: string, headingName: string): string[] {
	const lines = body.split("\n");
	const { index, level } = findHeadingIndex(lines, headingName);

	if (index < 0) {
		return lines.filter(l => LIST_ITEM_RE.test(l));
	}

	const result: string[] = [];
	for (let i = index + 1; i < lines.length; i++) {
		const line = lines[i];
		const hMatch = line.match(/^(#{1,6})\s/);
		if (hMatch && hMatch[1].length <= level) break;
		if (LIST_ITEM_RE.test(line)) result.push(line);
	}
	return result;
}

export async function parseRecipeFile(
	app: App,
	file: TFile,
	settings: RecipeBoxSettings,
): Promise<RecipeIngredient[]> {
	const raw = await app.vault.cachedRead(file);
	const body = stripFrontmatter(raw);
	const rawLines = extractIngredientLines(body, settings.ingredientsHeading);
	const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
	const multiplier = readRecipeMultiplier(cache);

	const results: RecipeIngredient[] = [];
	for (const line of rawLines) {
		const parsed = parseIngredientLine(line);
		if (!parsed || !parsed.name) continue;
		if (hasIgnoreTag(parsed.tags)) continue;
		results.push({
			...parsed,
			quantity: parsed.quantity !== null ? parsed.quantity * multiplier : null,
			sourcePath: file.path,
			sourceLabel: file.basename,
		});
	}
	return results;
}
