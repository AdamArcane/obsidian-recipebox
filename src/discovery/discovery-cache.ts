/**
 * In-memory cache for the recipe field discovery result. Survives the session
 * but not a plugin reload -- a fresh scan on next load is fast enough.
 * Consumers call refresh() explicitly (e.g. via a UI button) to rebuild.
 */
import { App } from "obsidian";
import { RecipeBoxSettings } from "../settings/settings-types";
import { discoverRecipeFields } from "./field-discovery";
import { inferFieldType } from "./field-type-infer";
import { FilterableType } from "./filter-types";

export interface DiscoveredField {
	key: string;
	type: FilterableType;
	/** Distinct observed values as strings, sorted. Used for "one of" pickers. */
	values: string[];
}

export interface DiscoveryResult {
	/** Discovered frontmatter fields, sorted by key. */
	fields: DiscoveredField[];
	/** Distinct tag names (no "#" prefix), sorted. */
	tags: string[];
	/** When this result was built (Date.now()). */
	scannedAt: number;
}

export class DiscoveryCache {
	private result: DiscoveryResult | null = null;

	/** Returns the cached result, or null if refresh() has not yet been called. */
	get(): DiscoveryResult | null {
		return this.result;
	}

	/** Scans all recipe files and rebuilds the cached result. */
	async refresh(app: App, settings: RecipeBoxSettings): Promise<DiscoveryResult> {
		const raw = discoverRecipeFields(app, settings);

		const fields: DiscoveredField[] = [];
		for (const [key, valueSet] of raw.fields) {
			const type = inferFieldType(valueSet);
			const values = [...valueSet]
				.map(v => String(v))
				.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
			fields.push({ key, type, values });
		}
		fields.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }));

		const tags = [...raw.tags].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: "base" })
		);

		this.result = { fields, tags, scannedAt: Date.now() };
		return this.result;
	}
}
