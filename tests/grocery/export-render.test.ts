import { describe, it, expect } from "vitest";
import { exportGroceryList } from "../../src/grocery/export-render";
import type { GroceryItem } from "../../src/types";

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
	return {
		key: "x",
		name: "x",
		unit: "",
		quantity: null,
		category: "Other",
		sources: [],
		checked: false,
		...overrides,
	};
}

describe("exportGroceryList", () => {
	it("returns an empty string for an empty list", () => {
		expect(exportGroceryList([], "plain")).toBe("");
	});

	it("sorts plain/checklist output alphabetically, case-insensitively", () => {
		const items = [item({ name: "banana" }), item({ name: "Apple" }), item({ name: "cherry" })];
		const result = exportGroceryList(items, "plain");
		expect(result).toBe("Apple\nBanana\nCherry");
	});

	it("filters out checked items when includeChecked is false", () => {
		const items = [item({ name: "apple", checked: true }), item({ name: "banana", checked: false })];
		const result = exportGroceryList(items, "plain", { includeChecked: false });
		expect(result).toBe("Banana");
	});

	it("returns an empty string when everything is filtered out", () => {
		const items = [item({ checked: true })];
		expect(exportGroceryList(items, "plain", { includeChecked: false })).toBe("");
	});

	it("groups items under category headings for the 'grouped' format", () => {
		const items = [
			item({ name: "chicken", category: "Meat" }),
			item({ name: "apple", category: "Produce" }),
		];
		const result = exportGroceryList(items, "grouped");
		expect(result).toBe("## Meat\n- [ ] Chicken\n\n## Produce\n- [ ] Apple");
	});

	it("falls back to 'Other' for a blank category in grouped format", () => {
		const items = [item({ name: "mystery", category: "" })];
		const result = exportGroceryList(items, "grouped");
		expect(result).toBe("## Other\n- [ ] Mystery");
	});
});
