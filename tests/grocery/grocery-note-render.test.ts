import { describe, it, expect } from "vitest";
import { renderGroceryLine, renderGrocerySections } from "../../src/grocery/grocery-note/render";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { GrocerySection } from "../../src/grocery/grocery-note/parse";

describe("renderGroceryLine", () => {
	it("renders quantity + unit + name for an unchecked item", () => {
		expect(renderGroceryLine("flour", "cup", 2, false)).toBe("- [ ] 2 cup flour");
	});

	it("renders a checked item with the checked checkbox", () => {
		expect(renderGroceryLine("egg", "", 1, true)).toBe("- [x] 1 egg");
	});

	it("omits the unit when there is none", () => {
		expect(renderGroceryLine("egg", "", 2, false)).toBe("- [ ] 2 egg");
	});

	it("omits quantity entirely when null but keeps a bare unit prefix if present", () => {
		expect(renderGroceryLine("salt", "pinch", null, false)).toBe("- [ ] pinch salt");
	});

	it("renders with neither quantity nor unit", () => {
		expect(renderGroceryLine("salt", "", null, false)).toBe("- [ ] salt");
	});
});

describe("renderGrocerySections", () => {
	function section(category: string, raws: string[]): GrocerySection {
		return {
			category,
			lines: raws.map((raw) => ({ kind: "opaque", key: "", name: "", unit: "", quantity: null, checked: false, raw })),
		};
	}

	it("orders sections by the configured manual category order", () => {
		const settings = { ...DEFAULT_SETTINGS, manualCategoryOrder: ["Meat", "Produce"] };
		const sections = [section("Produce", ["- [ ] apple"]), section("Meat", ["- [ ] chicken"])];
		const result = renderGrocerySections(sections, settings);
		expect(result.indexOf("## Meat")).toBeLessThan(result.indexOf("## Produce"));
	});

	it("places unordered categories after ordered ones, alphabetically", () => {
		const settings = { ...DEFAULT_SETTINGS, manualCategoryOrder: ["Meat"] };
		const sections = [section("Zebra", ["- [ ] z"]), section("Meat", ["- [ ] chicken"]), section("Apple", ["- [ ] a"])];
		const result = renderGrocerySections(sections, settings);
		const meatIdx = result.indexOf("## Meat");
		const appleIdx = result.indexOf("## Apple");
		const zebraIdx = result.indexOf("## Zebra");
		expect(meatIdx).toBeLessThan(appleIdx);
		expect(appleIdx).toBeLessThan(zebraIdx);
	});

	it("skips a section whose lines are all blank", () => {
		const settings = { ...DEFAULT_SETTINGS };
		const sections = [section("Empty", [""]), section("Produce", ["- [ ] apple"])];
		const result = renderGrocerySections(sections, settings);
		expect(result).not.toContain("## Empty");
		expect(result).toContain("## Produce");
	});

	it("always starts with the '# Grocery List' title", () => {
		const result = renderGrocerySections([], DEFAULT_SETTINGS);
		expect(result.startsWith("# Grocery List")).toBe(true);
	});
});
