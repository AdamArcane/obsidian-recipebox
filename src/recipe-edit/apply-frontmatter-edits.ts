/**
 * Applies edited frontmatter values to a plain object (the callback argument
 * of processFrontMatter), touching only keys the user changed. Always writes
 * the configured property name and deletes any alias key the value used to
 * live under, so `prep: 15` and `prepTime: 20` never coexist.
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { getRecipeMetaAliases, RecipeMetaAliases } from "../parser/recipe-meta-aliases";
import { applyNutritionEdits, NutritionEditValues } from "../ui/recipe-view/nutrition-write";

export interface FrontmatterEdits {
	image?: string;
	prepTime?: string;
	cookTime?: string;
	totalTime?: string;
	servings?: string;
	nutrition?: NutritionEditValues;
}

const PLAIN_NUMBER_RE = /^\d+(?:\.\d+)?$/;

// Plain numbers are stored as YAML numbers (what the template and the
// nutrition editor write); anything else ("4-6", "1h 30m") stays a string.
function coerce(value: string): string | number {
	return PLAIN_NUMBER_RE.test(value) ? Number(value) : value;
}

function writeKey(fm: Record<string, unknown>, configuredKey: string, aliasKeys: string[], value: string): void {
	// Case-insensitive, matching findValue, so a `Prep:` key is cleaned up too.
	const known = new Set([configuredKey, ...aliasKeys].map((k) => k.toLowerCase()));
	for (const key of Object.keys(fm)) {
		if (known.has(key.toLowerCase())) delete fm[key];
	}
	const trimmed = value.trim();
	if (trimmed !== "") fm[configuredKey] = coerce(trimmed);
}

export function applyFrontmatterEdits(
	fm: Record<string, unknown>,
	settings: RecipeBoxSettings,
	edits: FrontmatterEdits,
): void {
	const aliases: RecipeMetaAliases = getRecipeMetaAliases(settings);
	if (edits.image !== undefined) {
		// Images are paths/URLs, never numbers: skip coerce by writing directly.
		const known = new Set(aliases.image.map((k) => k.toLowerCase()));
		for (const key of Object.keys(fm)) if (known.has(key.toLowerCase())) delete fm[key];
		if (edits.image.trim() !== "") fm[settings.imageProperty] = edits.image.trim();
	}
	if (edits.prepTime !== undefined) writeKey(fm, settings.prepTimeProperty, aliases.prepTime, edits.prepTime);
	if (edits.cookTime !== undefined) writeKey(fm, settings.cookTimeProperty, aliases.cookTime, edits.cookTime);
	if (edits.totalTime !== undefined) writeKey(fm, settings.totalTimeProperty, aliases.totalTime, edits.totalTime);
	if (edits.servings !== undefined) writeKey(fm, settings.servingsProperty, aliases.servings, edits.servings);
	if (edits.nutrition) applyNutritionEdits(fm, settings, edits.nutrition);
}

export function hasFrontmatterEdits(edits: FrontmatterEdits): boolean {
	return Object.values(edits).some((v) => v !== undefined);
}
