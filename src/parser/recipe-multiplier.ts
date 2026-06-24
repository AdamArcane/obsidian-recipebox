import { CachedMetadata } from "obsidian";
import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";

export function readRecipeMultiplier(cache: CachedMetadata | null): number {
	const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;
	const raw = fm[RECIPE_FRONTMATTER.multiplier];
	const value = typeof raw === "string" ? Number(raw) : raw;
	if (typeof value !== "number" || !isFinite(value) || value <= 0) return 1;
	return value;
}
