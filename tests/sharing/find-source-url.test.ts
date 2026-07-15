import { describe, it, expect } from "vitest";
import { findSourceUrl } from "../../src/sharing/find-source-url";

describe("findSourceUrl", () => {
	it("finds a URL under any recognized candidate key", () => {
		expect(findSourceUrl({ source: "https://example.com" })).toBe("https://example.com");
		expect(findSourceUrl({ url: "https://example.com" })).toBe("https://example.com");
		expect(findSourceUrl({ sourceUrl: "https://example.com" })).toBe("https://example.com");
		expect(findSourceUrl({ source_url: "https://example.com" })).toBe("https://example.com");
	});

	it("trims whitespace", () => {
		expect(findSourceUrl({ source: "  https://example.com  " })).toBe("https://example.com");
	});

	it("returns null when no candidate key has a usable string value", () => {
		expect(findSourceUrl({})).toBeNull();
		expect(findSourceUrl({ source: "   " })).toBeNull();
		expect(findSourceUrl({ source: 123 })).toBeNull();
	});
});
