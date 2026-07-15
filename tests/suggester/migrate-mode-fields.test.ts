import { describe, it, expect } from "vitest";
import { migrateModeFieldReferences } from "../../src/suggester/migrate-mode-fields";
import type { SuggesterMode } from "../../src/suggester/strategy-types";

function mode(overrides: Partial<SuggesterMode> = {}): SuggesterMode {
	return { id: "m1", name: "Mode", filters: [], rules: [], isBuiltin: false, isDefault: false, ...overrides };
}

describe("migrateModeFieldReferences", () => {
	it("renames a matching field in both filters and rules", () => {
		const modes = [
			mode({
				filters: [{ field: "oldName", operator: "eq", value: "x" }],
				rules: [{ field: "oldName", direction: "favor-high" }],
			}),
		];
		const result = migrateModeFieldReferences(modes, "oldName", "newName");
		expect(result[0].filters[0].field).toBe("newName");
		expect(result[0].rules[0].field).toBe("newName");
	});

	it("leaves non-matching fields untouched", () => {
		const modes = [mode({ filters: [{ field: "other", operator: "eq", value: "x" }] })];
		const result = migrateModeFieldReferences(modes, "oldName", "newName");
		expect(result[0].filters[0].field).toBe("other");
	});

	it("is a no-op when oldName and newName are the same", () => {
		const modes = [mode({ filters: [{ field: "oldName", operator: "eq", value: "x" }] })];
		const result = migrateModeFieldReferences(modes, "oldName", "oldName");
		expect(result).toBe(modes);
	});

	it("is a no-op when either name is empty", () => {
		const modes = [mode()];
		expect(migrateModeFieldReferences(modes, "", "newName")).toBe(modes);
		expect(migrateModeFieldReferences(modes, "oldName", "")).toBe(modes);
	});

	it("does not mutate the original modes array", () => {
		const original = mode({ filters: [{ field: "oldName", operator: "eq", value: "x" }] });
		const modes = [original];
		migrateModeFieldReferences(modes, "oldName", "newName");
		expect(original.filters[0].field).toBe("oldName");
	});
});
