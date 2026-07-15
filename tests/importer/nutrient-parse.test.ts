import { describe, it, expect } from "vitest";
import { parseNutrient } from "../../src/importer/nutrient-parse";

describe("parseNutrient", () => {
	it("extracts a leading integer", () => {
		expect(parseNutrient("300 kcal")).toBe(300);
	});

	it("extracts and rounds a leading decimal", () => {
		expect(parseNutrient("12.5g")).toBe(13);
		expect(parseNutrient("12.4g")).toBe(12);
	});

	it("returns null when there is no leading number", () => {
		expect(parseNutrient("n/a")).toBeNull();
		expect(parseNutrient("")).toBeNull();
	});
});
