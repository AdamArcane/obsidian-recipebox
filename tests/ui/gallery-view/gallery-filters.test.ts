import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
	getAllTags: (cache: { tags?: string[] } | null) => cache?.tags ?? null,
}));

import { matchesGalleryFilters } from "../../../src/ui/gallery-view/gallery-filters";
import { DEFAULT_SETTINGS } from "../../../src/settings/settings-defaults";
import type { GallerySavedState } from "../../../src/settings/settings-types";
import type { App, CachedMetadata, TFile } from "obsidian";

function file(path = "Recipes/test.md"): TFile {
	return { path, basename: path.split("/").pop()!.replace(/\.md$/, ""), parent: { path: "Recipes" } } as unknown as TFile;
}

function cacheWith(frontmatter: Record<string, unknown>, tags: string[] = []): CachedMetadata {
	return { frontmatter, tags } as unknown as CachedMetadata;
}

const baseState: GallerySavedState = {
	...DEFAULT_SETTINGS.gallerySavedState,
};

const app = {} as App;

describe("matchesGalleryFilters — fieldFilters", () => {
	it("matches when fieldFilters is empty", () => {
		const state: GallerySavedState = { ...baseState, fieldFilters: [] };
		expect(matchesGalleryFilters(app, file(), cacheWith({}), state, DEFAULT_SETTINGS)).toBe(true);
	});

	it("passes a recipe matching a single property filter", () => {
		const state: GallerySavedState = {
			...baseState,
			fieldFilters: [{ field: "season", operator: "eq", value: "summer" }],
		};
		expect(matchesGalleryFilters(app, file(), cacheWith({ season: "summer" }), state, DEFAULT_SETTINGS)).toBe(true);
	});

	it("fails a recipe not matching a single property filter", () => {
		const state: GallerySavedState = {
			...baseState,
			fieldFilters: [{ field: "season", operator: "eq", value: "summer" }],
		};
		expect(matchesGalleryFilters(app, file(), cacheWith({ season: "winter" }), state, DEFAULT_SETTINGS)).toBe(false);
	});

	it("ANDs multiple property filters together", () => {
		const state: GallerySavedState = {
			...baseState,
			fieldFilters: [
				{ field: "season", operator: "eq", value: "summer" },
				{ field: "type", operator: "eq", value: "salad" },
			],
		};
		expect(
			matchesGalleryFilters(app, file(), cacheWith({ season: "summer", type: "salad" }), state, DEFAULT_SETTINGS),
		).toBe(true);
		expect(
			matchesGalleryFilters(app, file(), cacheWith({ season: "summer", type: "soup" }), state, DEFAULT_SETTINGS),
		).toBe(false);
	});

	it("matches an array-valued property against any of its elements ('one-of')", () => {
		const state: GallerySavedState = {
			...baseState,
			fieldFilters: [{ field: "cuisine", operator: "one-of", value: ["italian", "french"] }],
		};
		expect(matchesGalleryFilters(app, file(), cacheWith({ cuisine: ["italian", "greek"] }), state, DEFAULT_SETTINGS)).toBe(true);
		expect(matchesGalleryFilters(app, file(), cacheWith({ cuisine: ["greek"] }), state, DEFAULT_SETTINGS)).toBe(false);
	});

	it("ANDs a property filter with the existing fixed facets (e.g. favoriteOnly)", () => {
		const state: GallerySavedState = {
			...baseState,
			favoriteOnly: true,
			fieldFilters: [{ field: "season", operator: "eq", value: "summer" }],
		};
		const settings = DEFAULT_SETTINGS;
		expect(
			matchesGalleryFilters(
				app,
				file(),
				cacheWith({ season: "summer", [settings.favoriteProperty]: true }),
				state,
				settings,
			),
		).toBe(true);
		expect(
			matchesGalleryFilters(
				app,
				file(),
				cacheWith({ season: "summer", [settings.favoriteProperty]: false }),
				state,
				settings,
			),
		).toBe(false);
	});
});
