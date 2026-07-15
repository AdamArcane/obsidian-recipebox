import { describe, it, expect } from "vitest";
import { getRecipeMetaAliases } from "../../src/parser/recipe-meta-aliases";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";

describe("getRecipeMetaAliases", () => {
	it("puts the user-configured property name first", () => {
		const settings = { ...DEFAULT_SETTINGS, servingsProperty: "myServings" };
		expect(getRecipeMetaAliases(settings).servings[0]).toBe("myServings");
	});

	it("includes common fallback spellings", () => {
		const aliases = getRecipeMetaAliases(DEFAULT_SETTINGS);
		expect(aliases.servings).toEqual(expect.arrayContaining(["yield", "serves", "portions"]));
		expect(aliases.favorite).toEqual(expect.arrayContaining(["favourite", "starred"]));
	});

	it("de-duplicates when the configured property matches a fallback", () => {
		const settings = { ...DEFAULT_SETTINGS, favoriteProperty: "favourite" };
		const aliases = getRecipeMetaAliases(settings);
		expect(aliases.favorite.filter((k) => k === "favourite")).toHaveLength(1);
	});

	it("trims whitespace and drops empty keys", () => {
		const settings = { ...DEFAULT_SETTINGS, servingsProperty: "  " };
		const aliases = getRecipeMetaAliases(settings);
		expect(aliases.servings).not.toContain("");
		expect(aliases.servings).not.toContain("  ");
	});
});
