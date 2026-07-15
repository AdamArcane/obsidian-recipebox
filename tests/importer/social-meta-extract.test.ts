import { describe, it, expect } from "vitest";
import { extractSocialMeta } from "../../src/importer/social-meta-extract";

describe("extractSocialMeta", () => {
	it("prefers og:title and og:description when present", () => {
		const html = `<meta property="og:title" content="Chicken Alfredo"><meta property="og:description" content="Creamy and rich.">`;
		expect(extractSocialMeta(html)).toEqual({ title: "Chicken Alfredo", description: "Creamy and rich." });
	});

	it("matches meta tags with attributes in either order", () => {
		const html = `<meta content="Chicken Alfredo" property="og:title">`;
		expect(extractSocialMeta(html).title).toBe("Chicken Alfredo");
	});

	it("falls back to twitter:title/description when og: tags are absent", () => {
		const html = `<meta name="twitter:title" content="Fallback Title"><meta name="twitter:description" content="Fallback desc.">`;
		expect(extractSocialMeta(html)).toEqual({ title: "Fallback Title", description: "Fallback desc." });
	});

	it("falls back to the <title> tag when no meta title is present", () => {
		const html = `<title>Page Title</title>`;
		expect(extractSocialMeta(html).title).toBe("Page Title");
	});

	it("strips a trailing '- YouTube' suffix from the title", () => {
		const html = `<title>Chicken Alfredo - YouTube</title>`;
		expect(extractSocialMeta(html).title).toBe("Chicken Alfredo");
	});

	it("decodes HTML entities in the extracted title and description", () => {
		const html = `<meta property="og:title" content="Mom&#39;s Pasta"><meta property="og:description" content="Salt &amp; Pepper">`;
		expect(extractSocialMeta(html)).toEqual({ title: "Mom's Pasta", description: "Salt & Pepper" });
	});

	it("returns empty strings when nothing is found", () => {
		expect(extractSocialMeta("<html></html>")).toEqual({ title: "", description: "" });
	});
});
