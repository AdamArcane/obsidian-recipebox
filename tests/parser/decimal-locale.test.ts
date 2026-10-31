import { describe, it, expect } from "vitest";
import { decimalSeparatorFor, localiseDecimals } from "../../src/parser/decimal-locale";

describe("decimalSeparatorFor", () => {
	it("uses a comma for German and French, a dot for English", () => {
		expect(decimalSeparatorFor("de")).toBe(",");
		expect(decimalSeparatorFor("fr")).toBe(",");
		expect(decimalSeparatorFor("en")).toBe(".");
	});
	it("falls back to a dot for missing or invalid locales", () => {
		expect(decimalSeparatorFor(undefined)).toBe(".");
		expect(decimalSeparatorFor("not a locale!!")).toBe(".");
	});
});

describe("localiseDecimals", () => {
	it("replaces only dots between digits", () => {
		expect(localiseDecimals("0.5", ",")).toBe("0,5");
		expect(localiseDecimals("1.5-2.5", ",")).toBe("1,5-2,5");
		expect(localiseDecimals("approx.", ",")).toBe("approx.");
	});
	it("is a no-op for a dot separator", () => {
		expect(localiseDecimals("0.5", ".")).toBe("0.5");
	});
});
