import { describe, it, expect } from "vitest";
import { toTagArray, toNumber, toBoolean } from "../../src/parser/frontmatter-coerce";

describe("toTagArray", () => {
	it("normalizes an array of strings to lowercase, trimmed, deduplicated tags", () => {
		expect(toTagArray(["Vegan", " vegan ", "Quick"])).toEqual(["vegan", "quick"]);
	});

	it("splits a comma/semicolon-delimited string", () => {
		expect(toTagArray("vegan, quick; easy")).toEqual(["vegan", "quick", "easy"]);
	});

	it("drops empty entries produced by splitting", () => {
		expect(toTagArray("vegan,,quick")).toEqual(["vegan", "quick"]);
	});

	it("returns an empty array for non-array, non-string input", () => {
		expect(toTagArray(null)).toEqual([]);
		expect(toTagArray(undefined)).toEqual([]);
		expect(toTagArray(42)).toEqual([]);
	});
});

describe("toNumber", () => {
	it("passes finite numbers through unchanged", () => {
		expect(toNumber(4)).toBe(4);
		expect(toNumber(0)).toBe(0);
	});

	it("returns null for non-finite numbers", () => {
		expect(toNumber(Infinity)).toBeNull();
		expect(toNumber(NaN)).toBeNull();
	});

	it("extracts the first numeric substring from a string", () => {
		expect(toNumber("4 servings")).toBe(4);
		expect(toNumber("about -2.5 cups")).toBe(-2.5);
	});

	it("returns null when a string has no numeric substring", () => {
		expect(toNumber("none")).toBeNull();
	});

	it("returns null for other types", () => {
		expect(toNumber(true)).toBeNull();
		expect(toNumber(null)).toBeNull();
		expect(toNumber(undefined)).toBeNull();
	});
});

describe("toBoolean", () => {
	it("passes booleans through unchanged", () => {
		expect(toBoolean(true)).toBe(true);
		expect(toBoolean(false)).toBe(false);
	});

	it("treats nonzero numbers as true and zero as false", () => {
		expect(toBoolean(1)).toBe(true);
		expect(toBoolean(-1)).toBe(true);
		expect(toBoolean(0)).toBe(false);
	});

	it("recognizes true/yes/1 strings case-insensitively, whitespace tolerant", () => {
		expect(toBoolean("true")).toBe(true);
		expect(toBoolean(" TRUE ")).toBe(true);
		expect(toBoolean("Yes")).toBe(true);
		expect(toBoolean("1")).toBe(true);
	});

	it("treats any other string as false", () => {
		expect(toBoolean("false")).toBe(false);
		expect(toBoolean("no")).toBe(false);
		expect(toBoolean("0")).toBe(false);
		expect(toBoolean("")).toBe(false);
	});

	it("treats null/undefined/objects as false", () => {
		expect(toBoolean(null)).toBe(false);
		expect(toBoolean(undefined)).toBe(false);
		expect(toBoolean({})).toBe(false);
	});
});
