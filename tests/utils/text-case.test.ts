import { describe, it, expect } from "vitest";
import { slugifyMealType, deslugifyMealType, toTitleCase } from "../../src/utils/text-case";

describe("slugifyMealType", () => {
	it("lowercases and hyphenates spaces/punctuation", () => {
		expect(slugifyMealType("Main Course")).toBe("main-course");
		expect(slugifyMealType("Side/Snack")).toBe("side-snack");
	});

	it("strips leading and trailing hyphens", () => {
		expect(slugifyMealType("  Dessert!  ")).toBe("dessert");
	});

	it("falls back to 'meal' when nothing alphanumeric remains", () => {
		expect(slugifyMealType("!!!")).toBe("meal");
		expect(slugifyMealType("")).toBe("meal");
	});
});

describe("deslugifyMealType", () => {
	it("reverses hyphenation and title-cases", () => {
		expect(deslugifyMealType("main-course")).toBe("Main Course");
	});
});

describe("toTitleCase", () => {
	it("capitalizes the first letter of each word", () => {
		expect(toTitleCase("main course")).toBe("Main Course");
	});

	it("preserves hyphens as word separators without losing them", () => {
		expect(toTitleCase("side-snack")).toBe("Side-Snack");
	});

	it("handles a single word", () => {
		expect(toTitleCase("dessert")).toBe("Dessert");
	});

	it("handles empty string", () => {
		expect(toTitleCase("")).toBe("");
	});
});
