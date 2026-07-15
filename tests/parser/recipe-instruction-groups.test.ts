import { describe, it, expect } from "vitest";
import { splitBodyAroundInstructions } from "../../src/parser/recipe-instruction-groups";

describe("splitBodyAroundInstructions", () => {
	it("returns everything as 'before' when the heading is absent", () => {
		const result = splitBodyAroundInstructions("Just some text.", "Instructions");
		expect(result).toEqual({ before: "Just some text.", groups: [], after: "" });
	});

	it("collects ordered steps with no sub-headings", () => {
		const body = "## Instructions\n1. Mix.\n2. Bake.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups).toEqual([{ heading: null, headingLevel: 0, steps: ["Mix.", "Bake."] }]);
	});

	it("collects unordered steps when there is no numbering", () => {
		const body = "## Instructions\n- Mix.\n- Bake.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups).toEqual([{ heading: null, headingLevel: 0, steps: ["Mix.", "Bake."] }]);
	});

	it("splits into sub-groups by deeper headings, tracking heading level", () => {
		const body = "## Instructions\n### Dough\n1. Mix.\n### Filling\n1. Cook.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups).toEqual([
			{ heading: "Dough", headingLevel: 3, steps: ["Mix."] },
			{ heading: "Filling", headingLevel: 3, steps: ["Cook."] },
		]);
	});

	it("appends continuation lines to the current step", () => {
		const body = "## Instructions\n1. Mix the flour\n   and the sugar.\n2. Bake.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups[0].steps[0]).toBe("Mix the flour\n   and the sugar.");
	});

	it("strips a trailing horizontal rule from the last step", () => {
		const body = "## Instructions\n1. Mix.\n---";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups).toEqual([{ heading: null, headingLevel: 0, steps: ["Mix."] }]);
	});

	it("stops at a heading of equal or shallower depth than the instructions heading", () => {
		const body = "## Instructions\n1. Mix.\n## Notes\nSome notes.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.after).toBe("## Notes\nSome notes.");
	});

	it("produces no groups when there are no list items at all", () => {
		const body = "## Instructions\nJust some prose, no steps.";
		const result = splitBodyAroundInstructions(body, "Instructions");
		expect(result.groups).toEqual([]);
	});
});
