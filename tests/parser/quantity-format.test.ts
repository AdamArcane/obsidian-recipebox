import { describe, it, expect } from "vitest";
import { formatQuantity } from "../../src/parser/quantity-format";

describe("formatQuantity", () => {
	it("returns an empty string for null or NaN", () => {
		expect(formatQuantity(null)).toBe("");
		expect(formatQuantity(NaN)).toBe("");
	});

	it("returns '0' for zero", () => {
		expect(formatQuantity(0)).toBe("0");
	});

	it("snaps a near-integer value to a whole number", () => {
		expect(formatQuantity(2.001)).toBe("2");
		expect(formatQuantity(2.995)).toBe("3");
	});

	it("formats a plain whole number", () => {
		expect(formatQuantity(4)).toBe("4");
	});

	it("expresses a common fraction as a fraction string", () => {
		expect(formatQuantity(0.5)).toBe("1/2");
		expect(formatQuantity(0.25)).toBe("1/4");
		expect(formatQuantity(0.75)).toBe("3/4");
	});

	it("combines a whole number with a fraction", () => {
		expect(formatQuantity(1.5)).toBe("1 1/2");
		expect(formatQuantity(2.25)).toBe("2 1/4");
	});

	it("falls back to two decimal places for an unrepresentable fraction", () => {
		expect(formatQuantity(3.05)).toBe("3.05");
	});

	it("preserves the sign for negative quantities", () => {
		expect(formatQuantity(-1.5)).toBe("-1 1/2");
		expect(formatQuantity(-2)).toBe("-2");
	});
});

describe("formatQuantity with metric units", () => {
	it("uses decimals instead of fractions for metric units", () => {
		expect(formatQuantity(41 + 2 / 3, "g")).toBe("41.7");
		expect(formatQuantity(630 + 2 / 3, "ml")).toBe("631");
		expect(formatQuantity(83 + 1 / 3, "ml")).toBe("83.3");
		expect(formatQuantity(1.5, "kg")).toBe("1.5");
		expect(formatQuantity(2 / 3, "l")).toBe("0.67");
	});

	it("keeps amounts the author wrote at 1x", () => {
		expect(formatQuantity(12.5, "g")).toBe("12.5");
		expect(formatQuantity(1.25, "kg")).toBe("1.25");
		expect(formatQuantity(0.25, "l")).toBe("0.25");
	});

	it("rounds to whole numbers from 100, one decimal from 10, two below", () => {
		expect(formatQuantity(99.96, "g")).toBe("100");
		expect(formatQuantity(100.4, "g")).toBe("100");
		expect(formatQuantity(9.994, "g")).toBe("9.99");
		expect(formatQuantity(2, "g")).toBe("2");
	});

	it("keeps a tiny nonzero amount from rounding to zero", () => {
		expect(formatQuantity(0.004, "g")).toBe("0.004");
		expect(formatQuantity(0, "g")).toBe("0");
	});

	it("leaves non-metric units on fractions", () => {
		expect(formatQuantity(1.5, "cup")).toBe("1 1/2");
		expect(formatQuantity(1.5, "")).toBe("1 1/2");
		expect(formatQuantity(1 / 3, "oz")).toBe("1/3");
	});
});
