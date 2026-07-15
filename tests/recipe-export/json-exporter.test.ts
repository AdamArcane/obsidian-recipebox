import { describe, it, expect } from "vitest";
import { buildRecipeExportJson } from "../../src/recipe-export/exporters/json-exporter";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData, DEFAULT_EXPORT_OPTIONS } from "./fixtures";

describe("buildRecipeExportJson", () => {
	it("carries over the basic scalar fields", () => {
		const payload = buildRecipeExportJson(makeExportData(), {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(payload.title).toBe("Test Recipe");
		expect(payload.servings).toBe(4);
		expect(payload.multiplier).toBe(1);
	});

	it("maps parsed ingredients and strips Obsidian markdown from names/notes", () => {
		const data = makeExportData({
			parsedIngredients: [
				{ quantity: 1, unit: "cup", name: "[[Flour]]", note: "sifted", tags: [], raw: "1 cup [[Flour]] (sifted)", sourcePath: "x.md", sourceLabel: "x" },
			],
		});
		const payload = buildRecipeExportJson(data, {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(payload.ingredients).toEqual([
			{ quantity: 1, unit: "cup", name: "Flour", note: "sifted", tags: [] },
		]);
	});

	it("omits lastMade when includeCookHistoryAndSections is off", () => {
		const data = makeExportData({ meta: { diet: [], allergens: [], times: { prep: null, cook: null, total: null }, favorite: false, cookedCount: 0, lastMade: "2024-01-01" } });
		const payload = buildRecipeExportJson(data, {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(payload.lastMade).toBeNull();
	});

	it("includes lastMade when includeCookHistoryAndSections is on", () => {
		const data = makeExportData({ meta: { diet: [], allergens: [], times: { prep: null, cook: null, total: null }, favorite: false, cookedCount: 0, lastMade: "2024-01-01" } });
		const payload = buildRecipeExportJson(data, {}, DEFAULT_SETTINGS, { ...DEFAULT_EXPORT_OPTIONS, includeCookHistoryAndSections: true });
		expect(payload.lastMade).toBe("2024-01-01");
	});

	it("represents a null image as null and a url image with its kind/value", () => {
		const noImage = buildRecipeExportJson(makeExportData({ image: null }), {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(noImage.image).toBeNull();

		const urlImage = buildRecipeExportJson(
			makeExportData({ image: { kind: "url", url: "https://example.com/pic.jpg" } }),
			{},
			DEFAULT_SETTINGS,
			DEFAULT_EXPORT_OPTIONS,
		);
		expect(urlImage.image).toEqual({ kind: "url", value: "https://example.com/pic.jpg" });
	});

	it("serializes to a valid JSON string via exportRecipeJson", async () => {
		const { exportRecipeJson } = await import("../../src/recipe-export/exporters/json-exporter");
		const json = exportRecipeJson(makeExportData(), {}, DEFAULT_SETTINGS, DEFAULT_EXPORT_OPTIONS);
		expect(() => JSON.parse(json)).not.toThrow();
		expect(JSON.parse(json).title).toBe("Test Recipe");
	});
});
