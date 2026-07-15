import { describe, it, expect } from "vitest";
import { titleToFilename } from "../../src/importer/note-filename";

describe("titleToFilename", () => {
	it("passes through a normal title unchanged", () => {
		expect(titleToFilename("Chicken Alfredo")).toBe("Chicken Alfredo");
	});

	it("strips filesystem-unsafe characters", () => {
		expect(titleToFilename('Mom\'s "Best" Pasta: Serves 4/5 <easy> *quick* [tag] #1')).toBe(
			"Mom's Best Pasta Serves 45 easy quick tag 1",
		);
	});

	it("collapses runs of whitespace and trims", () => {
		expect(titleToFilename("  Chicken    Alfredo  ")).toBe("Chicken Alfredo");
	});

	it("falls back to 'Untitled Recipe' when nothing safe remains", () => {
		expect(titleToFilename("///???")).toBe("Untitled Recipe");
		expect(titleToFilename("")).toBe("Untitled Recipe");
	});
});
