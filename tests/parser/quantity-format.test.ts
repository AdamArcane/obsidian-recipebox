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
