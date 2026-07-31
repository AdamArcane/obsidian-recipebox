import { describe, it, expect } from "vitest";
import {
	stripListMarkers,
	extractInlineNotes,
	extractTrailingTags,
	stripMarkdownEmphasis,
	stripOf,
	normaliseName,
	ingredientKey,
	hasIgnoreTag,
} from "../../src/parser/ingredient-clean";

describe("stripListMarkers", () => {
	it("strips a leading bullet marker", () => {
		expect(stripListMarkers("- 2 cups flour")).toBe("2 cups flour");
		expect(stripListMarkers("* 2 cups flour")).toBe("2 cups flour");
	});

	it("strips a leading numbered-list marker", () => {
		expect(stripListMarkers("1. 2 cups flour")).toBe("2 cups flour");
	});

	it("strips a leading checkbox marker", () => {
		expect(stripListMarkers("- [ ] 2 cups flour")).toBe("2 cups flour");
		expect(stripListMarkers("- [x] 2 cups flour")).toBe("2 cups flour");
	});

	it("leaves a plain line unchanged", () => {
		expect(stripListMarkers("2 cups flour")).toBe("2 cups flour");
	});
});

describe("extractInlineNotes", () => {
	it("extracts a single parenthesised note", () => {
		expect(extractInlineNotes("flour (sifted)")).toEqual({ cleaned: "flour", note: "sifted" });
	});

	it("joins multiple notes with commas", () => {
		expect(extractInlineNotes("flour (sifted) (or all-purpose)")).toEqual({
			cleaned: "flour",
			note: "sifted, or all-purpose",
		});
	});

	it("handles nested parens as a single note", () => {
		expect(extractInlineNotes("sugar (white (granulated))")).toEqual({
			cleaned: "sugar",
			note: "white (granulated)",
		});
	});

	it("returns null note when there are no parens", () => {
		expect(extractInlineNotes("flour")).toEqual({ cleaned: "flour", note: null });
	});
});

describe("extractTrailingTags", () => {
	it("extracts trailing hashtags", () => {
		expect(extractTrailingTags("flour #pantry #baking")).toEqual({
			cleaned: "flour",
			tags: ["pantry", "baking"],
		});
	});

	it("returns no tags when there are none", () => {
		expect(extractTrailingTags("flour")).toEqual({ cleaned: "flour", tags: [] });
	});

	it("does not match a hash in the middle of the text", () => {
		expect(extractTrailingTags("flour #pantry more text")).toEqual({
			cleaned: "flour #pantry more text",
			tags: [],
		});
	});
});

describe("stripMarkdownEmphasis", () => {
	it("strips bold and italic markers", () => {
		expect(stripMarkdownEmphasis("**flour** and __sugar__")).toBe("flour and sugar");
	});

	it("strips paired single-asterisk emphasis around a RecipeMD amount", () => {
		expect(stripMarkdownEmphasis("*600g* flour")).toBe("600g flour");
		expect(stripMarkdownEmphasis("*1 clove* garlic")).toBe("1 clove garlic");
		expect(stripMarkdownEmphasis("*½* cup sugar")).toBe("½ cup sugar");
	});

	it("leaves single asterisks/underscores alone", () => {
		expect(stripMarkdownEmphasis("2*3 cups")).toBe("2*3 cups");
	});

	it("leaves an unpaired asterisk alone", () => {
		expect(stripMarkdownEmphasis("*flour")).toBe("*flour");
		expect(stripMarkdownEmphasis("flour *")).toBe("flour *");
	});
});

describe("stripOf", () => {
	it("strips a leading 'of'", () => {
		expect(stripOf("of sugar")).toBe("sugar");
		expect(stripOf("Of Sugar")).toBe("Sugar");
	});

	it("leaves text without a leading 'of' unchanged", () => {
		expect(stripOf("sugar")).toBe("sugar");
	});
});

describe("normaliseName", () => {
	it("lowercases and collapses whitespace", () => {
		expect(normaliseName("  All-Purpose   Flour  ")).toBe("all-purpose flour");
	});

	it("trims dashes that sit at the very start/end of the string", () => {
		expect(normaliseName("--Flour--")).toBe("flour");
	});
});

describe("ingredientKey", () => {
	it("combines normalised name and lowercase unit", () => {
		expect(ingredientKey("Flour", "Cups")).toBe("flour|cups");
	});
});

describe("hasIgnoreTag", () => {
	it("detects the ignore-ingredient tag regardless of separators/case", () => {
		expect(hasIgnoreTag(["ignore-ingredient"])).toBe(true);
		expect(hasIgnoreTag(["IgnoreIngredient"])).toBe(true);
		expect(hasIgnoreTag(["ignore_ingredient"])).toBe(true);
	});

	it("returns false when the tag is absent", () => {
		expect(hasIgnoreTag(["pantry"])).toBe(false);
		expect(hasIgnoreTag([])).toBe(false);
	});
});
