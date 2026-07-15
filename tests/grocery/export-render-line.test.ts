import { describe, it, expect } from "vitest";
import { renderLine } from "../../src/grocery/export-render-line";
import type { GroceryItem } from "../../src/types";

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
	return {
		key: "flour|cup",
		name: "flour",
		unit: "cup",
		quantity: 2,
		category: "Baking",
		sources: [],
		checked: false,
		...overrides,
	};
}

describe("renderLine", () => {
	it("title-cases the name and appends quantity + unit in parens", () => {
		expect(renderLine(item(), "plain", { includeChecked: true })).toBe("Flour (2 cup)");
	});

	it("omits the parenthetical suffix when there is no quantity", () => {
		expect(renderLine(item({ quantity: null, unit: "" }), "plain", { includeChecked: true })).toBe("Flour");
	});

	it("omits the unit when there is a quantity but no unit", () => {
		expect(renderLine(item({ unit: "" }), "plain", { includeChecked: true })).toBe("Flour (2)");
	});

	it("renders an unchecked checklist line with an empty checkbox", () => {
		expect(renderLine(item(), "checklist", { includeChecked: true })).toBe("- [ ] Flour (2 cup)");
	});

	it("renders a checked item as checked only when includeChecked is true", () => {
		const checkedItem = item({ checked: true });
		expect(renderLine(checkedItem, "checklist", { includeChecked: true })).toBe("- [x] Flour (2 cup)");
		expect(renderLine(checkedItem, "checklist", { includeChecked: false })).toBe("- [ ] Flour (2 cup)");
	});

	it("formats a fractional quantity via formatQuantity", () => {
		expect(renderLine(item({ quantity: 0.5 }), "plain", { includeChecked: true })).toBe("Flour (1/2 cup)");
	});
});
