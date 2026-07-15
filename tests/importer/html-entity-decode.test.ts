import { describe, it, expect } from "vitest";
import { decodeHtmlEntities } from "../../src/importer/html-entity-decode";

describe("decodeHtmlEntities", () => {
	it("decodes common named entities", () => {
		expect(decodeHtmlEntities("Salt &amp; Pepper")).toBe("Salt & Pepper");
		expect(decodeHtmlEntities("&lt;tag&gt;")).toBe("<tag>");
		expect(decodeHtmlEntities("&quot;quoted&quot;")).toBe('"quoted"');
	});

	it("decodes numeric and hex entities present in the map", () => {
		expect(decodeHtmlEntities("It&#39;s")).toBe("It's");
		expect(decodeHtmlEntities("It&#x27;s")).toBe("It's");
	});

	it("decodes curly quote entities", () => {
		expect(decodeHtmlEntities("&ldquo;Hi&rdquo;")).toBe("“Hi”");
	});

	it("leaves an unrecognized entity unchanged", () => {
		expect(decodeHtmlEntities("&unknown;")).toBe("&unknown;");
	});

	it("leaves plain text without entities unchanged", () => {
		expect(decodeHtmlEntities("Plain text")).toBe("Plain text");
	});
});
