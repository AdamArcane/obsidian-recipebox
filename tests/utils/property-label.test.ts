import { describe, it, expect } from "vitest";
import { propertyToLabel } from "../../src/utils/property-label";

describe("propertyToLabel", () => {
	it("converts camelCase to a spaced, capitalized label", () => {
		expect(propertyToLabel("prepTime")).toBe("Prep time");
	});

	it("splits a run of capitals before a new word (ABCDef -> ABC Def)", () => {
		expect(propertyToLabel("cookedGIValue")).toBe("Cooked gi value");
	});

	it("converts snake_case and kebab-case to spaced words", () => {
		expect(propertyToLabel("cook_time")).toBe("Cook time");
		expect(propertyToLabel("cook-time")).toBe("Cook time");
	});

	it("handles dot.case", () => {
		expect(propertyToLabel("cook.time")).toBe("Cook time");
	});

	it("collapses multiple separators into a single space", () => {
		expect(propertyToLabel("cook__time")).toBe("Cook time");
	});

	it("capitalizes only the first letter, lowercasing the rest", () => {
		expect(propertyToLabel("TOTALTIME")).toBe("Totaltime");
	});

	it("leaves a single lowercase word capitalized", () => {
		expect(propertyToLabel("servings")).toBe("Servings");
	});
});
