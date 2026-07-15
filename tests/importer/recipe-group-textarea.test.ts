import { describe, it, expect } from "vitest";
import { groupsToTextarea, textareaToGroups } from "../../src/importer/recipe-group-textarea";
import type { ImportedGroup } from "../../src/importer/recipe-extract-types";

describe("groupsToTextarea", () => {
	it("renders an unnamed group as flat lines", () => {
		const groups: ImportedGroup[] = [{ name: null, items: ["flour", "sugar"] }];
		expect(groupsToTextarea(groups)).toBe("flour\nsugar");
	});

	it("renders named groups with a heading line", () => {
		const groups: ImportedGroup[] = [{ name: "Dough", items: ["flour"] }, { name: "Filling", items: ["sugar"] }];
		expect(groupsToTextarea(groups)).toBe("## Dough\nflour\n## Filling\nsugar");
	});
});

describe("textareaToGroups", () => {
	it("parses flat lines into a single unnamed group", () => {
		expect(textareaToGroups("flour\nsugar")).toEqual([{ name: null, items: ["flour", "sugar"] }]);
	});

	it("splits into named groups at heading lines", () => {
		const result = textareaToGroups("## Dough\nflour\n## Filling\nsugar");
		expect(result).toEqual([
			{ name: "Dough", items: ["flour"] },
			{ name: "Filling", items: ["sugar"] },
		]);
	});

	it("strips list markers from items", () => {
		expect(textareaToGroups("- flour\n* sugar\n1. eggs\n• milk")).toEqual([
			{ name: null, items: ["flour", "sugar", "eggs", "milk"] },
		]);
	});

	it("ignores blank lines", () => {
		expect(textareaToGroups("flour\n\nsugar")).toEqual([{ name: null, items: ["flour", "sugar"] }]);
	});

	it("drops a leading empty unnamed group when the text starts with a heading", () => {
		expect(textareaToGroups("## Dough\nflour")).toEqual([{ name: "Dough", items: ["flour"] }]);
	});

	it("round-trips through groupsToTextarea", () => {
		const groups: ImportedGroup[] = [{ name: "Dough", items: ["flour", "water"] }];
		expect(textareaToGroups(groupsToTextarea(groups))).toEqual(groups);
	});
});
