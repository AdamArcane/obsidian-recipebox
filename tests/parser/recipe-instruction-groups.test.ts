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

// RecipeMD notes carry no instructions heading, so the method region is passed
// in whole with isRecipeMd set. The spec calls everything to end-of-file the
// instructions; these cases cover the deliberate divergence that lets a
// section-level heading end the method instead.
describe("splitBodyAroundInstructions, RecipeMD notes", () => {
	it("keeps the whole method when nothing follows it", () => {
		const result = splitBodyAroundInstructions("1. Mix.\n2. Bake.", "Instructions", true);
		expect(result).toEqual({
			before: "",
			groups: [{ heading: null, headingLevel: 0, steps: ["Mix.", "Bake."] }],
			after: "",
		});
	});

	it("ends the method at a Notes section instead of swallowing it into the last step", () => {
		const body = "1. Mix.\n2. Bake.\n\n## Notes\n\nUse room-temperature eggs.";
		const result = splitBodyAroundInstructions(body, "Instructions", true);
		expect(result.groups[0].steps).toEqual(["Mix.", "Bake."]);
		expect(result.after).toBe("## Notes\n\nUse room-temperature eggs.");
	});

	it("ends the method at the Cook History block the plugin appends itself", () => {
		// Exactly what replaceNoteBodySection() writes on the first mark-cooked.
		const body = [
			"1. Mix.",
			"",
			"## Cook History",
			"<!-- This section managed by the Recipe Box plugin. Manual edits will be overwritten. -->",
			"",
			"- 2026-08-01",
		].join("\n");
		const result = splitBodyAroundInstructions(body, "Instructions", true);
		expect(result.groups[0].steps).toEqual(["Mix."]);
		expect(result.after.startsWith("## Cook History")).toBe(true);
	});

	it("treats headings deeper than section level as method sub-groups", () => {
		const body = "### Dough\n1. Mix.\n### Filling\n1. Cook.\n\n## Notes\nLet it rest.";
		const result = splitBodyAroundInstructions(body, "Instructions", true);
		expect(result.groups).toEqual([
			{ heading: "Dough", headingLevel: 3, steps: ["Mix."] },
			{ heading: "Filling", headingLevel: 3, steps: ["Cook."] },
		]);
		expect(result.after).toBe("## Notes\nLet it rest.");
	});

	it("keeps a prose method as 'before' rather than dropping it, and still splits the section", () => {
		const body = "Mix everything and bake it.\n\n## Notes\nLet it rest.";
		const result = splitBodyAroundInstructions(body, "Instructions", true);
		expect(result.groups).toEqual([]);
		expect(result.before).toBe("Mix everything and bake it.\n");
		expect(result.after).toBe("## Notes\nLet it rest.");
	});

	it("leaves a non-RecipeMD note untouched, so a bulleted Notes list is not read as a method", () => {
		const body = "## Notes\n- Not a method.";
		const result = splitBodyAroundInstructions(body, "Instructions", false);
		expect(result).toEqual({ before: body, groups: [], after: "" });
	});
});
