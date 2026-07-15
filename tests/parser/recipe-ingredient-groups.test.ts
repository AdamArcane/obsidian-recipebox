import { describe, it, expect } from "vitest";
import { splitBodyAroundIngredients } from "../../src/parser/recipe-ingredient-groups";

describe("splitBodyAroundIngredients", () => {
	it("returns everything as 'before' when the heading is absent", () => {
		const result = splitBodyAroundIngredients("Just some text.", "Ingredients");
		expect(result).toEqual({ before: "Just some text.", groups: [], after: "" });
	});

	it("collects a flat list of ingredient lines with no sub-headings", () => {
		const body = "Intro text\n## Ingredients\n- flour\n- sugar\n## Instructions\n1. Mix.";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.before).toBe("Intro text");
		expect(result.groups).toEqual([{ heading: null, lines: ["- flour", "- sugar"] }]);
		expect(result.after).toBe("## Instructions\n1. Mix.");
	});

	it("splits ingredients into sub-groups by deeper headings", () => {
		// When the ingredients heading is immediately followed by a sub-heading
		// (no bare list items directly under it), the initial placeholder group
		// ({heading: null, lines: []}) gets pushed too -- only a *trailing*
		// empty group is discarded, not a leading one. Exporters/renderers
		// downstream already skip zero-line groups, so this is harmless in
		// practice, but it does show up here.
		const body = "## Ingredients\n### Dough\n- flour\n### Filling\n- sugar\n## Instructions";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.groups).toEqual([
			{ heading: null, lines: [] },
			{ heading: "Dough", lines: ["- flour"] },
			{ heading: "Filling", lines: ["- sugar"] },
		]);
	});

	it("stops at a heading of equal or shallower depth than the ingredients heading", () => {
		const body = "## Ingredients\n- flour\n## Instructions\n1. Mix.";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.after).toBe("## Instructions\n1. Mix.");
	});

	it("ignores non-list-item lines within the ingredients section", () => {
		const body = "## Ingredients\nSome prose here.\n- flour";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.groups).toEqual([{ heading: null, lines: ["- flour"] }]);
	});

	it("discards a trailing empty group only when it also has no heading", () => {
		const body = "## Ingredients\n- flour\n## Instructions";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.groups).toEqual([{ heading: null, lines: ["- flour"] }]);
	});

	it("keeps a trailing sub-heading group even when it ends up with no lines", () => {
		// The trailing-discard only strips an *unheaded* placeholder group; a
		// named sub-heading with zero ingredients under it is left in the output.
		const body = "## Ingredients\n- flour\n### Empty Group\n## Instructions";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.groups).toEqual([
			{ heading: null, lines: ["- flour"] },
			{ heading: "Empty Group", lines: [] },
		]);
	});

	it("supports numbered ingredient lists", () => {
		const body = "## Ingredients\n1. flour\n2. sugar";
		const result = splitBodyAroundIngredients(body, "Ingredients");
		expect(result.groups).toEqual([{ heading: null, lines: ["1. flour", "2. sugar"] }]);
	});
});
