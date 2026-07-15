import { describe, it, expect, vi } from "vitest";

// grocery-note/write.ts pulls in utils/vault-notes.ts, which imports the
// `moment` value export from "obsidian" (a types-only package with no
// runtime JS) -- stub it since none of the pure functions under test call it.
vi.mock("obsidian", () => ({ moment: () => ({ format: () => "" }) }));

import { mergeIntoGroceryText, removeFromGroceryText } from "../../src/grocery/grocery-note/write";
import { DEFAULT_SETTINGS } from "../../src/settings/settings-defaults";
import type { ContributionMap } from "../../src/types";

describe("mergeIntoGroceryText", () => {
	it("adds a new contribution as a new item under its categorized section", () => {
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		const result = mergeIntoGroceryText("# Grocery List\n", contributions, DEFAULT_SETTINGS);
		expect(result).toContain("## Grain");
		expect(result).toContain("- [ ] 2 cup flour");
	});

	it("sums quantity into an existing matching line rather than duplicating it", () => {
		const existing = "# Grocery List\n\n## Grain\n- [ ] 2 cup flour";
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 1 } };
		const result = mergeIntoGroceryText(existing, contributions, DEFAULT_SETTINGS);
		expect(result).toContain("- [ ] 3 cup flour");
		expect(result.match(/flour/g)).toHaveLength(1);
	});

	it("creates a new section when the categorized section doesn't already exist", () => {
		const contributions: ContributionMap = { "chicken|": { name: "chicken", unit: "", quantity: 1 } };
		const result = mergeIntoGroceryText("# Grocery List\n", contributions, DEFAULT_SETTINGS);
		expect(result).toContain("## Meat");
	});
});

describe("removeFromGroceryText", () => {
	it("decrements a matching line's quantity", () => {
		const existing = "# Grocery List\n\n## Baking\n- [ ] 3 cup flour";
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 1 } };
		const result = removeFromGroceryText(existing, contributions, DEFAULT_SETTINGS);
		expect(result).toContain("- [ ] 2 cup flour");
	});

	it("removes the line entirely when the quantity would drop to zero or below", () => {
		const existing = "# Grocery List\n\n## Baking\n- [ ] 2 cup flour";
		const contributions: ContributionMap = { "flour|cup": { name: "flour", unit: "cup", quantity: 2 } };
		const result = removeFromGroceryText(existing, contributions, DEFAULT_SETTINGS);
		expect(result).not.toContain("flour");
	});

	it("leaves lines with no matching contribution untouched", () => {
		const existing = "# Grocery List\n\n## Baking\n- [ ] 2 cup flour";
		const result = removeFromGroceryText(existing, {}, DEFAULT_SETTINGS);
		expect(result).toContain("- [ ] 2 cup flour");
	});

	it("removes a matching line outright when either side has a null quantity (can't partially subtract)", () => {
		const existing = "# Grocery List\n\n## Baking\n- [ ] pinch salt";
		const contributions: ContributionMap = { "salt|pinch": { name: "salt", unit: "pinch", quantity: null } };
		const result = removeFromGroceryText(existing, contributions, DEFAULT_SETTINGS);
		expect(result).not.toContain("salt");
	});
});
