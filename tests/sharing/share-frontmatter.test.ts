import { describe, it, expect } from "vitest";
import { getShareData } from "../../src/sharing/share-frontmatter";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { CachedMetadata } from "obsidian";

function cacheWith(frontmatter: Record<string, unknown>): CachedMetadata {
	return { frontmatter } as CachedMetadata;
}

describe("getShareData", () => {
	it("reads a complete share data object from the configured property", () => {
		const shareData = { slug: "abc", token: "tok", created: "2024-01-01", expires: "2024-02-01" };
		const cache = cacheWith({ [DEFAULT_SETTINGS.shareDataProperty]: shareData });
		expect(getShareData(cache, DEFAULT_SETTINGS)).toEqual(shareData);
	});

	it("returns null when the share property is missing", () => {
		expect(getShareData(cacheWith({}), DEFAULT_SETTINGS)).toBeNull();
	});

	it("returns null when the share property isn't an object", () => {
		const cache = cacheWith({ [DEFAULT_SETTINGS.shareDataProperty]: "not-an-object" });
		expect(getShareData(cache, DEFAULT_SETTINGS)).toBeNull();
	});

	it("returns null when any required sub-field is missing", () => {
		const cache = cacheWith({ [DEFAULT_SETTINGS.shareDataProperty]: { slug: "abc", token: "tok" } });
		expect(getShareData(cache, DEFAULT_SETTINGS)).toBeNull();
	});

	it("returns null for a null cache", () => {
		expect(getShareData(null, DEFAULT_SETTINGS)).toBeNull();
	});
});
