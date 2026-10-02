import { describe, it, expect } from "vitest";
import { parseImportDuration } from "../../../src/importer/file-import/parse-import-duration";

describe("parseImportDuration", () => {
	it("parses ISO 8601", () => {
		expect(parseImportDuration("PT1H15M")).toBe(75);
		expect(parseImportDuration("PT45M")).toBe(45);
		expect(parseImportDuration("P1DT1H")).toBe(1500);
	});
	it("parses free text", () => {
		expect(parseImportDuration("15 minutes")).toBe(15);
		expect(parseImportDuration("1 hour 30 min")).toBe(90);
	});
	it("returns null for garbage, empty and zero", () => {
		expect(parseImportDuration("soon")).toBeNull();
		expect(parseImportDuration("")).toBeNull();
		expect(parseImportDuration("PT")).toBeNull();
		expect(parseImportDuration("PT0M")).toBeNull();
		expect(parseImportDuration(undefined)).toBeNull();
	});
});
