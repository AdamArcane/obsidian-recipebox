import { describe, it, expect } from "vitest";
import { detectPlatform } from "../../src/importer/social-platform-detect";

describe("detectPlatform", () => {
	it("detects youtube.com, www.youtube.com, and youtu.be", () => {
		expect(detectPlatform("https://youtube.com/watch?v=x")).toBe("youtube");
		expect(detectPlatform("https://www.youtube.com/watch?v=x")).toBe("youtube");
		expect(detectPlatform("https://youtu.be/x")).toBe("youtube");
	});

	it("detects tiktok.com including subdomains", () => {
		expect(detectPlatform("https://www.tiktok.com/@user/video/1")).toBe("tiktok");
	});

	it("detects instagram.com including subdomains", () => {
		expect(detectPlatform("https://www.instagram.com/p/xyz")).toBe("instagram");
	});

	it("returns 'unknown' for an unrelated domain", () => {
		expect(detectPlatform("https://example.com/recipe")).toBe("unknown");
	});

	it("returns 'unknown' for an unparseable URL instead of throwing", () => {
		expect(detectPlatform("not a url")).toBe("unknown");
	});
});
