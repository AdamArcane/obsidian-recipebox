/**
 * Resolves a recipe's hero image value from frontmatter, falling back to the
 * first image embedded in the note body. Shared by RecipeView (which has the
 * body already loaded) and the gallery view (which resolves this lazily,
 * only for recipes with no frontmatter image -- see gallery-image.ts).
 */
import { RecipeBoxSettings } from "../settings/settings-types";
import { findValue } from "./frontmatter-lookup";
import { getRecipeMetaAliases } from "./recipe-meta-aliases";
import { findFirstImageInBody } from "./recipe-body-clean";

export function frontmatterImageValue(
	frontmatter: Record<string, unknown>,
	settings: RecipeBoxSettings,
): string | null {
	const raw = findValue(frontmatter, getRecipeMetaAliases(settings).image);
	if (typeof raw !== "string") return null;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function resolveHeroImageValue(
	frontmatter: Record<string, unknown>,
	rawBody: string,
	settings: RecipeBoxSettings,
): string | null {
	const frontmatterImage = frontmatterImageValue(frontmatter, settings);
	const fallbackBodyImage = settings.useFirstBodyImageWhenFrontmatterEmpty
		? findFirstImageInBody(rawBody)
		: null;
	return frontmatterImage ?? fallbackBodyImage;
}

// The one place that knows what counts as "a default is configured" --
// trimmed, empty string treated as disabled. Callers only reach for this
// once every real source (frontmatter, body) has already come up empty.
// Never call this for the public share/export path -- that stays real-image-only.
export function defaultRecipeImageValue(settings: RecipeBoxSettings): string | null {
	const trimmed = settings.defaultRecipeImage.trim();
	return trimmed.length > 0 ? trimmed : null;
}
