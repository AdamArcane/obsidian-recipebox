import { describe, it, expect } from "vitest";
import { pickTagCategory } from "../../src/grocery/category-tags";

describe("pickTagCategory", () => {
	it("returns null for missing or empty tags", () => {
		expect(pickTagCategory(undefined)).toBeNull();
		expect(pickTagCategory([])).toBeNull();
	});

	it("picks the most frequent tag", () => {
		expect(pickTagCategory(["produce", "dairy", "produce"])).toBe("Produce");
	});

	it("breaks a frequency tie by earliest occurrence", () => {
		expect(pickTagCategory(["dairy", "produce"])).toBe("Dairy");
	});

	it("is case-insensitive when counting but preserves the first-seen casing", () => {
		expect(pickTagCategory(["Produce", "produce", "PRODUCE"])).toBe("Produce");
	});

	it("ignores blank/whitespace-only tags", () => {
		expect(pickTagCategory(["  ", "produce"])).toBe("Produce");
	});

	it("capitalizes the returned category's first letter", () => {
		expect(pickTagCategory(["snack"])).toBe("Snack");
	});
});
