/**
 * Scans all recipe files in the vault and collects the distinct frontmatter
 * fields (with their observed values) and tags. Intended to be called by
 * discovery-cache.ts rather than on every consumer request.
 */
import { App, getAllTags } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { isRecipeFile } from "../lifecycle/recipe-file-detection";
import { RECIPE_FRONTMATTER } from "../settings/frontmatter-keys";

/**
 * Plugin-internal frontmatter keys that aren't meaningful filter criteria.
 * These drive recipe detection and rendering, not user-level metadata.
 */
function buildSkipKeys(settings: RecipeBoxSettings): Set<string> {
	return new Set<string>([
		settings.recipeTypePropertyName,
		settings.imageProperty,
		RECIPE_FRONTMATTER.multiplier,
		// Obsidian injects "position" into the parsed frontmatter object to record
		// where in the file the frontmatter block appears. It is not a user field.
		"position",
	]);
}

export interface RawDiscovery {
	/** Frontmatter key -> distinct observed scalar values across all recipes. */
	fields: Map<string, Set<unknown>>;
	/** Keys whose value was an array in at least one recipe (enables "split array" UI). */
	arrayFields: Set<string>;
	/** Distinct tag names, without the leading "#". */
	tags: Set<string>;
}

export function discoverRecipeFields(app: App, settings: RecipeBoxSettings): RawDiscovery {
	const fields = new Map<string, Set<unknown>>();
	const arrayFields = new Set<string>();
	const tags = new Set<string>();
	const skipKeys = buildSkipKeys(settings);

	for (const file of app.vault.getMarkdownFiles()) {
		if (!isRecipeFile(app, file, settings)) continue;

		const cache = app.metadataCache.getFileCache(file);
		if (!cache) continue;

		// Collect frontmatter fields
		const fm = (cache.frontmatter ?? {}) as Record<string, unknown>;
		for (const [key, value] of Object.entries(fm)) {
			if (skipKeys.has(key) || value === null || value === undefined) continue;

			const set = fields.get(key) ?? new Set<unknown>();
			// Array values (e.g. allergens: [nuts, dairy]) contribute each element
			// individually so type inference sees "nuts" and "dairy" as strings,
			// not the array itself.
			if (Array.isArray(value)) {
				arrayFields.add(key);
				for (const item of value) {
					if (item !== null && item !== undefined) set.add(item);
				}
			} else {
				set.add(value);
			}
			fields.set(key, set);
		}

		// getAllTags merges frontmatter tags and inline #tags, all with "#" prefix.
		for (const tag of getAllTags(cache) ?? []) {
			tags.add(tag.slice(1)); // strip leading "#"
		}
	}

	return { fields, arrayFields, tags };
}
