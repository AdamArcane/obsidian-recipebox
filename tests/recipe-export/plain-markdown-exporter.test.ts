import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => ({
	getAllTags: () => [],
	setIcon: () => {},
}));

import { exportPlainMarkdown } from "../../src/recipe-export/exporters/plain-markdown-exporter";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData, DEFAULT_EXPORT_OPTIONS } from "./fixtures";

describe("exportPlainMarkdown", () => {
	it("renders the title, ingredients, and instructions under the configured headings", () => {
		const md = exportPlainMarkdown(makeExportData(), {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("# Test Recipe");
		expect(md).toContain("## Ingredients");
		expect(md).toContain("2 cups flour");
		expect(md).toContain("## Instructions");
		expect(md).toContain("1. Mix.");
		expect(md).toContain("2. Bake.");
	});

	it("includes an external image as a markdown image link", () => {
		const data = makeExportData({ image: { kind: "url", url: "https://example.com/pic.jpg" } });
		const md = exportPlainMarkdown(data, {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("![Test Recipe](https://example.com/pic.jpg)");
	});

	it("includes the servings summary line in italics", () => {
		const md = exportPlainMarkdown(makeExportData({ servings: 4 }), {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("*Serves 4*");
	});

	it("includes an allergens line when allergens are present", () => {
		const data = makeExportData({
			meta: { diet: [], allergens: ["peanuts"], times: { prep: null, cook: null, total: null }, favorite: false, cookedCount: 0, lastMade: null },
		});
		const md = exportPlainMarkdown(data, {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("*Contains: peanuts*");
	});

	it("strips Obsidian wikilinks from ingredient lines", () => {
		const data = makeExportData({ ingredientGroups: [{ heading: null, lines: ["1 cup [[Flour]]"] }] });
		const md = exportPlainMarkdown(data, {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).toContain("1 cup Flour");
		expect(md).not.toContain("[[");
	});

	it("collapses runs of 3+ blank lines down to a single blank line", () => {
		const md = exportPlainMarkdown(makeExportData({ servings: null }), {}, { ...DEFAULT_SETTINGS, headerBadges: [] }, DEFAULT_EXPORT_OPTIONS);
		expect(md).not.toMatch(/\n{3,}/);
	});
});
