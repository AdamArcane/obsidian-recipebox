import { describe, it, expect } from "vitest";
import { BUILTIN_MODES, BUILTIN_MODE_IDS } from "../../src/suggester/built-in-strategies";

describe("BUILTIN_MODES", () => {
	it("gives every mode a unique id", () => {
		const ids = BUILTIN_MODES.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("marks every built-in mode as isBuiltin", () => {
		expect(BUILTIN_MODES.every((m) => m.isBuiltin)).toBe(true);
	});

	it("has exactly one default mode", () => {
		expect(BUILTIN_MODES.filter((m) => m.isDefault)).toHaveLength(1);
	});

	it("has ids matching the BUILTIN_MODE_IDS map", () => {
		const idSet = new Set(BUILTIN_MODES.map((m) => m.id));
		for (const id of Object.values(BUILTIN_MODE_IDS)) {
			expect(idSet.has(id)).toBe(true);
		}
	});

	it("gives every mode at least one scoring rule", () => {
		expect(BUILTIN_MODES.every((m) => m.rules.length > 0)).toBe(true);
	});
});
