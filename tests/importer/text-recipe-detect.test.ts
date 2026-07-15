import { describe, it, expect } from "vitest";
import { INGREDIENTS_SECTION_RE, INSTRUCTIONS_SECTION_RE, isSectionKeyword } from "../../src/importer/text-recipe-detect";

describe("INGREDIENTS_SECTION_RE", () => {
	it("matches common ingredients heading spellings", () => {
		expect(INGREDIENTS_SECTION_RE.test("Ingredients")).toBe(true);
		expect(INGREDIENTS_SECTION_RE.test("Ingredient:")).toBe(true);
		expect(INGREDIENTS_SECTION_RE.test("What You'll Need")).toBe(true);
		expect(INGREDIENTS_SECTION_RE.test("## Ingredients")).toBe(true);
	});

	it("does not match an unrelated line", () => {
		expect(INGREDIENTS_SECTION_RE.test("2 cups flour")).toBe(false);
	});
});

describe("INSTRUCTIONS_SECTION_RE", () => {
	it("matches common instructions heading spellings", () => {
		expect(INSTRUCTIONS_SECTION_RE.test("Instructions")).toBe(true);
		expect(INSTRUCTIONS_SECTION_RE.test("Directions")).toBe(true);
		expect(INSTRUCTIONS_SECTION_RE.test("Method")).toBe(true);
		expect(INSTRUCTIONS_SECTION_RE.test("Steps:")).toBe(true);
		expect(INSTRUCTIONS_SECTION_RE.test("How to Make")).toBe(true);
	});
});

describe("isSectionKeyword", () => {
	it("recognizes both ingredient and instruction headings", () => {
		expect(isSectionKeyword("Ingredients")).toBe(true);
		expect(isSectionKeyword("Directions")).toBe(true);
	});

	it("returns false for a non-heading line", () => {
		expect(isSectionKeyword("Mix everything together.")).toBe(false);
	});
});
