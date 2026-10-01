import { describe, it, expect } from "vitest";
import { joinExportPath, normalizeExportFolder } from "../../src/utils/export-path";

describe("export path", () => {
	it("treats blank and the picker's root value as the vault root", () => {
		expect(joinExportPath("", "Note")).toBe("Note");
		expect(joinExportPath("/", "Note")).toBe("Note");
		expect(normalizeExportFolder("/")).toBe("");
	});

	it("joins a normal folder without doubling slashes", () => {
		expect(joinExportPath("Recipe Exports", "Note")).toBe("Recipe Exports/Note");
		expect(joinExportPath("/Exports/", "Note")).toBe("Exports/Note");
	});
});
