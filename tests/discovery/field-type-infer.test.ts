import { describe, it, expect } from "vitest";
import { inferFieldType } from "../../src/discovery/field-type-infer";

describe("inferFieldType", () => {
	it("infers 'number' when all samples are numbers", () => {
		expect(inferFieldType([1, 2, 3])).toBe("number");
	});

	it("infers 'boolean' when all samples are booleans", () => {
		expect(inferFieldType([true, false])).toBe("boolean");
	});

	it("infers 'date' for strings starting with an ISO date segment", () => {
		expect(inferFieldType(["2024-01-01", "2024-06-15"])).toBe("date");
	});

	it("infers 'string' for plain strings", () => {
		expect(inferFieldType(["italian", "french"])).toBe("string");
	});

	it("picks the majority type across mixed samples", () => {
		expect(inferFieldType([1, 2, "not a number"])).toBe("number");
	});

	it("falls back to 'string' on an exact tie", () => {
		expect(inferFieldType([1, "a"])).toBe("string");
	});

	it("defaults to 'string' for an empty sample set", () => {
		expect(inferFieldType([])).toBe("string");
	});
});
