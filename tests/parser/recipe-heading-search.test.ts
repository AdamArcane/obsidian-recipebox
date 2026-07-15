import { describe, it, expect } from "vitest";
import { findHeadingIndex } from "../../src/parser/recipe-heading-search";

describe("findHeadingIndex", () => {
	it("finds a heading by exact name and reports its level", () => {
		const lines = ["Intro", "## Ingredients", "- flour"];
		expect(findHeadingIndex(lines, "Ingredients")).toEqual({ index: 1, level: 2 });
	});

	it("matches case-insensitively and trims whitespace", () => {
		const lines = ["## ingredients "];
		expect(findHeadingIndex(lines, "  Ingredients  ")).toEqual({ index: 0, level: 2 });
	});

	it("ignores trailing hashes (closed ATX headings)", () => {
		const lines = ["## Ingredients ##"];
		expect(findHeadingIndex(lines, "Ingredients")).toEqual({ index: 0, level: 2 });
	});

	it("returns index -1 and level 0 when not found", () => {
		expect(findHeadingIndex(["no headings here"], "Ingredients")).toEqual({ index: -1, level: 0 });
	});

	it("does not match a heading name occurring as plain text", () => {
		expect(findHeadingIndex(["Ingredients"], "Ingredients")).toEqual({ index: -1, level: 0 });
	});
});
