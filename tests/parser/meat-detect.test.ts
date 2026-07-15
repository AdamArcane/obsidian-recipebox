import { describe, it, expect } from "vitest";
import { detectMeatTemp } from "../../src/parser/meat-detect";

describe("detectMeatTemp", () => {
	it("detects a plain meat keyword", () => {
		expect(detectMeatTemp("chicken breast")).not.toBeNull();
	});

	it("detects a pluralized keyword", () => {
		expect(detectMeatTemp("chicken breasts")).not.toBeNull();
	});

	it("does not match a keyword embedded in a longer word", () => {
		// "ham" should not match inside "hammer" thanks to the word-boundary regex.
		expect(detectMeatTemp("hammer time snack")).toBeNull();
	});

	it("returns null for a non-meat ingredient", () => {
		expect(detectMeatTemp("all-purpose flour")).toBeNull();
	});

	it("returns null when a non-meat qualifier is present", () => {
		// "broth" is a non-meat qualifier that suppresses an otherwise-matching
		// meat keyword, e.g. "chicken broth" is not a meat cut.
		expect(detectMeatTemp("chicken broth")).toBeNull();
	});

	it("is case-insensitive", () => {
		expect(detectMeatTemp("CHICKEN BREAST")).not.toBeNull();
	});
});
