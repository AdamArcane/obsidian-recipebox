import { describe, it, expect } from "vitest";
import { resolveImageTarget, findFirstImageInBody, stripRedundantBodyContent } from "../../src/parser/recipe-body-clean";

describe("resolveImageTarget", () => {
	it("unwraps a wikilink embed to its bare filename", () => {
		expect(resolveImageTarget("![[image.png]]")).toBe("image.png");
	});

	it("unwraps a wikilink with an alias or anchor", () => {
		expect(resolveImageTarget("[[image.png|alt text]]")).toBe("image.png");
		expect(resolveImageTarget("[[image.png#anchor]]")).toBe("image.png");
	});

	it("returns a plain value trimmed, unchanged", () => {
		expect(resolveImageTarget("  image.png  ")).toBe("image.png");
	});
});

describe("findFirstImageInBody", () => {
	it("finds a wikilink embed image", () => {
		expect(findFirstImageInBody("Some text\n![[photo.jpg]]\nMore text")).toBe("photo.jpg");
	});

	it("finds a standard markdown image", () => {
		expect(findFirstImageInBody("![alt](photo.jpg)")).toBe("photo.jpg");
	});

	it("prefers the first image in reading order", () => {
		expect(findFirstImageInBody("![[first.png]]\n![[second.png]]")).toBe("first.png");
	});

	it("returns null when there is no image", () => {
		expect(findFirstImageInBody("Just text, no images.")).toBeNull();
	});

	it("handles a markdown image with an angle-bracketed URL destination", () => {
		expect(findFirstImageInBody("![alt](<https://example.com/pic.jpg>)")).toBe("https://example.com/pic.jpg");
	});
});

describe("stripRedundantBodyContent", () => {
	it("removes a leading H1 title heading matching the file title", () => {
		const body = "# My Recipe\n\nSome intro.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: true, title: "My Recipe" })).toBe("Some intro.");
	});

	it("leaves the title heading when cleanNoteBody is off", () => {
		const body = "# My Recipe\n\nSome intro.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: false, title: "My Recipe" })).toBe(body);
	});

	it("removes a matching wikilink embed image line", () => {
		const body = "![[hero.jpg]]\n\nSome intro.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: true, imageValue: "hero.jpg" })).toBe("Some intro.");
	});

	it("removes a matching standard markdown image line", () => {
		const body = "![Hero](hero.jpg)\n\nSome intro.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: true, imageValue: "hero.jpg" })).toBe("Some intro.");
	});

	it("collapses 3+ blank lines down to a single blank line", () => {
		const body = "Line one.\n\n\n\nLine two.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: false })).toBe("Line one.\n\nLine two.");
	});

	it("trims leading whitespace left behind after stripping", () => {
		const body = "# My Recipe\n\n\nSome intro.";
		expect(stripRedundantBodyContent(body, { cleanNoteBody: true, title: "My Recipe" })).toBe("Some intro.");
	});
});
