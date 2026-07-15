import { describe, it, expect } from "vitest";
import { buildShareHtml } from "../../src/sharing/build-share-html";
import { toShareableRecipeData } from "../../src/sharing/share-export-data";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import { makeExportData } from "../recipe-export/fixtures";
import type { ResolvedShareImage } from "../../src/sharing/resolve-share-image";

describe("buildShareHtml", () => {
	it("renders the recipe title, ingredients, and instructions", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		expect(html).toContain("<title>Test Recipe</title>");
		expect(html).toContain('<h1 class="rbs-title">Test Recipe</h1>');
		expect(html).toContain("2 cups flour");
		expect(html).toContain("Mix.");
	});

	it("escapes HTML-unsafe characters in the visible title", () => {
		const shareable = toShareableRecipeData(makeExportData({ title: `<script>alert(1)</script>` }));
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		expect(html).toContain('<h1 class="rbs-title">&lt;script&gt;alert(1)&lt;/script&gt;</h1>');
	});

	it("neutralizes a </script> sequence inside the embedded JSON-LD so it can't break out of the script tag", () => {
		// Recipe data can originate from a scraped third-party page, so a title
		// containing "</script><script>...</script>" must not be able to close
		// the JSON-LD <script> tag early and inject a live script into the page.
		const shareable = toShareableRecipeData(makeExportData({ title: `</script><script>alert(1)</script>` }));
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		const scriptMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
		expect(scriptMatch).not.toBeNull();
		// The raw "<" must not appear unescaped inside the JSON-LD payload.
		expect(scriptMatch![1]).not.toContain("</script>");
		expect(scriptMatch![1]).toContain("\\u003c/script>\\u003cscript>");
	});

	it("shows scraper-origin attribution near the header image when applicable", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const image: ResolvedShareImage = { src: "https://example.com/pic.jpg", isScraperOrigin: true };
		const html = buildShareHtml(shareable, { source: "https://original-site.com/recipe" }, DEFAULT_SETTINGS, image, null);
		expect(html).toContain("Photo originally from");
		expect(html).toContain("https://original-site.com/recipe");
	});

	it("omits attribution entirely when there is no image and no source URL", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		expect(html).not.toContain("Photo originally from");
		expect(html).not.toContain('<div class="rbs-footer-attribution">');
	});

	it("falls back to the default accent color when none is captured", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		expect(html).toContain("--rb-accent: #7c5cff;");
	});

	it("embeds valid JSON-LD in a script tag", () => {
		const shareable = toShareableRecipeData(makeExportData());
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
		expect(match).not.toBeNull();
		expect(() => JSON.parse(match![1])).not.toThrow();
	});

	it("renders nutrition entries when present", () => {
		const shareable = toShareableRecipeData(makeExportData({ nutrition: { Calories: "300" } }));
		const html = buildShareHtml(shareable, {}, DEFAULT_SETTINGS, null, null);
		expect(html).toContain("Nutrition");
		expect(html).toContain("300");
	});
});
