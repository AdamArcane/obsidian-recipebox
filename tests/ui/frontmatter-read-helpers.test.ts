import { describe, it, expect } from "vitest";
import { fmStr, fmNum, fmNutrient } from "../../src/ui/recipe-view/frontmatter-read-helpers";

describe("fmStr", () => {
	it("returns the first matching non-empty string value", () => {
		expect(fmStr({ title: "  Pasta  " }, ["title"])).toBe("Pasta");
	});

	it("skips a blank string and falls through to the next key", () => {
		expect(fmStr({ a: "  ", b: "value" }, ["a", "b"])).toBe("value");
	});

	it("returns null when no key matches", () => {
		expect(fmStr({}, ["title"])).toBeNull();
	});
});

describe("fmNum", () => {
	it("returns a finite number as-is", () => {
		expect(fmNum({ servings: 4 }, ["servings"])).toBe(4);
	});

	it("parses a numeric string", () => {
		expect(fmNum({ servings: "4" }, ["servings"])).toBe(4);
	});

	it("skips a non-finite number and an unparseable string", () => {
		expect(fmNum({ a: Infinity, b: "abc", c: 5 }, ["a", "b", "c"])).toBe(5);
	});

	it("returns null when nothing matches", () => {
		expect(fmNum({}, ["servings"])).toBeNull();
	});
});

describe("fmNutrient", () => {
	it("reads from the flat frontmatter first", () => {
		expect(fmNutrient({ calories: 300 }, ["calories"])).toBe(300);
	});

	it("falls back to a nested nutrition object", () => {
		expect(fmNutrient({ nutrition: { calories: 300 } }, ["calories"])).toBe(300);
	});

	it("prefers the flat value over the nested one when both are present", () => {
		expect(fmNutrient({ calories: 100, nutrition: { calories: 300 } }, ["calories"])).toBe(100);
	});

	it("returns null when neither flat nor nested has the key", () => {
		expect(fmNutrient({}, ["calories"])).toBeNull();
	});

	it("ignores a nutrition field that isn't an object", () => {
		expect(fmNutrient({ nutrition: "not an object" }, ["calories"])).toBeNull();
	});
});
