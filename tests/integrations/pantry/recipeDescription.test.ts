import { describe, expect, it } from "vitest";
import { describeSources } from "../../../src/integrations/pantry/recipeDescription";

const recipe = (path: string, day?: string) => ({ source: { kind: "recipe" as const, path, day } });

describe("describeSources", () => {
	it("uses the note name without folder or extension", () => {
		expect(describeSources([recipe("Recipes/Mains/Chicken Curry.md")])).toBe("Chicken Curry");
	});
	it("lists each recipe once, in order, even when planned on several days", () => {
		expect(describeSources([recipe("A.md", "Mon"), recipe("B.md"), recipe("A.md", "Thu")])).toBe("A, B");
	});
	it("ignores manual entries and missing history", () => {
		expect(describeSources([{ source: { kind: "manual" } }])).toBe("");
		expect(describeSources(undefined)).toBe("");
	});
});
