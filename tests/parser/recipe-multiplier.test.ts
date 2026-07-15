import { describe, it, expect } from "vitest";
import { readRecipeMultiplier } from "../../src/parser/recipe-multiplier";
import { RECIPE_FRONTMATTER } from "../../src/settings/frontmatter-keys";
import type { CachedMetadata } from "obsidian";

function cacheWith(frontmatter: Record<string, unknown>): CachedMetadata {
	return { frontmatter } as CachedMetadata;
}

describe("readRecipeMultiplier", () => {
	it("reads a numeric multiplier from frontmatter", () => {
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: 2 }))).toBe(2);
	});

	it("coerces a numeric string", () => {
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: "1.5" }))).toBe(1.5);
	});

	it("defaults to 1 when the field is absent", () => {
		expect(readRecipeMultiplier(cacheWith({}))).toBe(1);
	});

	it("defaults to 1 when the cache itself is null", () => {
		expect(readRecipeMultiplier(null)).toBe(1);
	});

	it("defaults to 1 for a zero or negative value", () => {
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: 0 }))).toBe(1);
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: -2 }))).toBe(1);
	});

	it("defaults to 1 for a non-numeric, non-string value", () => {
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: true }))).toBe(1);
	});

	it("defaults to 1 for an unparseable string", () => {
		expect(readRecipeMultiplier(cacheWith({ [RECIPE_FRONTMATTER.multiplier]: "double" }))).toBe(1);
	});
});
