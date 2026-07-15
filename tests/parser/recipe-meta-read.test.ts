import { describe, it, expect } from "vitest";
import { readRecipeMeta, formatLocalISO, formatMinutes, matchingAllergens } from "../../src/parser/recipe-meta-read";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { CachedMetadata } from "obsidian";

function cacheWith(frontmatter: Record<string, unknown>): CachedMetadata {
	return { frontmatter } as CachedMetadata;
}

describe("formatLocalISO", () => {
	it("formats a date as YYYY-MM-DD, zero-padded", () => {
		expect(formatLocalISO(new Date(2024, 0, 5))).toBe("2024-01-05");
	});
});

describe("formatMinutes", () => {
	it("formats under an hour as '<n>m'", () => {
		expect(formatMinutes(45)).toBe("45m");
	});

	it("formats an exact hour as '<h>h'", () => {
		expect(formatMinutes(60)).toBe("1h");
	});

	it("formats hours and minutes together", () => {
		expect(formatMinutes(90)).toBe("1h 30m");
	});
});

describe("matchingAllergens", () => {
	it("returns allergens present in both lists, case-insensitively", () => {
		expect(matchingAllergens(["Peanuts", "Dairy"], ["peanuts"])).toEqual(["Peanuts"]);
	});

	it("returns an empty array when either list is empty", () => {
		expect(matchingAllergens([], ["peanuts"])).toEqual([]);
		expect(matchingAllergens(["peanuts"], [])).toEqual([]);
	});

	it("returns an empty array when there is no overlap", () => {
		expect(matchingAllergens(["dairy"], ["peanuts"])).toEqual([]);
	});
});

describe("readRecipeMeta", () => {
	it("reads diet as a normalized tag array", () => {
		const cache = cacheWith({ diet: "Vegan, Gluten-Free" });
		expect(readRecipeMeta(cache, DEFAULT_SETTINGS).diet).toEqual(["vegan", "gluten-free"]);
	});

	it("derives total time from prep + cook when total is absent", () => {
		const cache = cacheWith({ prepTime: 10, cookTime: 20 });
		expect(readRecipeMeta(cache, DEFAULT_SETTINGS).times).toEqual({ prep: 10, cook: 20, total: 30 });
	});

	it("uses an explicit total time over the derived sum", () => {
		const cache = cacheWith({ prepTime: 10, cookTime: 20, totalTime: 45 });
		expect(readRecipeMeta(cache, DEFAULT_SETTINGS).times.total).toBe(45);
	});

	it("reads favorite and cookedCount with sensible defaults", () => {
		expect(readRecipeMeta(cacheWith({}), DEFAULT_SETTINGS)).toMatchObject({ favorite: false, cookedCount: 0 });
		const cache = cacheWith({ favorite: true, cookedCount: 3 });
		expect(readRecipeMeta(cache, DEFAULT_SETTINGS)).toMatchObject({ favorite: true, cookedCount: 3 });
	});

	it("floors and clamps a fractional or negative cookedCount to a non-negative integer", () => {
		expect(readRecipeMeta(cacheWith({ cookedCount: 3.7 }), DEFAULT_SETTINGS).cookedCount).toBe(3);
		expect(readRecipeMeta(cacheWith({ cookedCount: -2 }), DEFAULT_SETTINGS).cookedCount).toBe(0);
	});

	it("reads lastMade as a trimmed string, from the configured property", () => {
		const settings = { ...DEFAULT_SETTINGS, lastMadeProperty: "lastMade" };
		const cache = cacheWith({ lastMade: "  2024-01-01  " });
		expect(readRecipeMeta(cache, settings).lastMade).toBe("2024-01-01");
	});

	it("returns null for a missing or empty lastMade", () => {
		const settings = { ...DEFAULT_SETTINGS, lastMadeProperty: "lastMade" };
		expect(readRecipeMeta(cacheWith({}), settings).lastMade).toBeNull();
		expect(readRecipeMeta(cacheWith({ lastMade: "  " }), settings).lastMade).toBeNull();
	});

	it("handles a null cache with all-default values", () => {
		const meta = readRecipeMeta(null, DEFAULT_SETTINGS);
		expect(meta.diet).toEqual([]);
		expect(meta.favorite).toBe(false);
		expect(meta.cookedCount).toBe(0);
	});
});
