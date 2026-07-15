import { describe, it, expect } from "vitest";
import { buildShareRecipeJsonLd, collectShareWarnings } from "../../src/sharing/share-json-ld";
import { toShareableRecipeData } from "../../src/sharing/share-export-data";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData } from "../recipe-export/fixtures";
import type { ResolvedShareImage } from "../../src/sharing/resolve-share-image";

describe("buildShareRecipeJsonLd", () => {
	it("builds a schema.org Recipe with a generic (non-identifying) author", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const jsonLd = buildShareRecipeJsonLd(shareable, {}, DEFAULT_SETTINGS, null);
		expect(jsonLd.author).toEqual({ "@type": "Organization", name: "Recipe Box" });
		expect(jsonLd.name).toBe("Test Recipe");
	});

	it("includes a resolved image src when present and not a data: URI", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const image: ResolvedShareImage = { src: "https://example.com/pic.jpg", isScraperOrigin: false };
		const jsonLd = buildShareRecipeJsonLd(shareable, {}, DEFAULT_SETTINGS, image);
		expect(jsonLd.image).toBe("https://example.com/pic.jpg");
	});

	it("omits a legacy data: URI image as a safety guard", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const image: ResolvedShareImage = { src: "data:image/jpeg;base64,abc", isScraperOrigin: false };
		const jsonLd = buildShareRecipeJsonLd(shareable, {}, DEFAULT_SETTINGS, image);
		expect(jsonLd.image).toBeUndefined();
	});

	it("never emits diet or allergens fields (not on the share allowlist)", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const jsonLd = buildShareRecipeJsonLd(shareable, {}, DEFAULT_SETTINGS, null);
		expect(jsonLd).not.toHaveProperty("suitableForDiet");
		expect(jsonLd).not.toHaveProperty("keywords");
	});

	it("includes nutrition resolved from frontmatter via the configured property names", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const fm = { [DEFAULT_SETTINGS.caloriesProperty]: 300 };
		const jsonLd = buildShareRecipeJsonLd(shareable, fm, DEFAULT_SETTINGS, null);
		expect(jsonLd.nutrition?.calories).toBe("300 calories");
	});
});

describe("collectShareWarnings", () => {
	it("warns when there is no description text", () => {
		const shareable = toShareableRecipeData(makeExportData({ introContent: "" }));
		expect(collectShareWarnings(shareable, null)).toContain(
			"The recipe has no description text. Adding an introduction improves how the recipe appears in structured data and search results.",
		);
	});

	it("warns when there is no servings count", () => {
		const shareable = toShareableRecipeData(makeExportData({ servings: null, introContent: "Has a description." }));
		expect(collectShareWarnings(shareable, null)).toContain(
			"The recipe has no serving size. Adding a servings count improves structured data completeness.",
		);
	});

	it("returns no warnings when both description and servings are present", () => {
		const shareable = toShareableRecipeData(makeExportData({ servings: 4, introContent: "A description." }));
		expect(collectShareWarnings(shareable, null)).toEqual([]);
	});
});
