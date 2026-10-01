import { describe, it, expect } from "vitest";
import { linkTargetFromAttributes, splitLinkpath } from "../../src/ui/recipe-view/link-target";

describe("linkTargetFromAttributes", () => {
	it("prefers data-href, which Obsidian writes already decoded", () => {
		expect(linkTargetFromAttributes("flocon d'avoine", "flocon%20d'avoine")).toBe("flocon d'avoine");
		expect(linkTargetFromAttributes("farine de blé T55", null)).toBe("farine de blé T55");
	});

	it("keeps heading and block suffixes", () => {
		expect(linkTargetFromAttributes("Folder/Note#Heading", null)).toBe("Folder/Note#Heading");
		expect(linkTargetFromAttributes("Note#^abc123", null)).toBe("Note#^abc123");
	});

	it("falls back to a percent-decoded href for Markdown links", () => {
		expect(linkTargetFromAttributes(null, "Note%20Name.md")).toBe("Note Name.md");
		expect(linkTargetFromAttributes("  ", "Note%20Name.md")).toBe("Note Name.md");
	});

	it("uses the raw href when the escape is malformed", () => {
		expect(linkTargetFromAttributes(null, "100%.md")).toBe("100%.md");
	});

	it("returns null when there is nothing to open", () => {
		expect(linkTargetFromAttributes(null, null)).toBeNull();
		expect(linkTargetFromAttributes("", "  ")).toBeNull();
	});
});

describe("splitLinkpath", () => {
	it("drops the heading or block suffix", () => {
		expect(splitLinkpath("Folder/Note#Heading")).toBe("Folder/Note");
		expect(splitLinkpath("Note#^abc")).toBe("Note");
		expect(splitLinkpath("Note")).toBe("Note");
	});
});
